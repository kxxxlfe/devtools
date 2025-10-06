import Vue, { watch } from 'vue'
import { cloneDeep } from 'lodash-es'
import { stringify, parse, set, get, cloneVueData } from '@utils/util'
import SharedData from '@utils/shared-data'
import clone from './clone'
import { debounce } from './utils'
import { bridge as exBridge, api } from './bridge'

const isProd = process.env.NODE_ENV === 'production'

class VuexBackend {
  constructor(hook, bridge, isLegacy) {
    exBridge.send(api.vuex.init)

    this.hook = hook
    this.bridge = bridge
    this.isLegacy = isLegacy
    this.store = hook.store

    // Flush info from hook
    // (for example, modules registered before backend was created)
    this.earlyModules = hook.flushStoreModules()

    /** Initial store state */
    this.initialState = this.hook.initialState

    /** Internal store vm for mutation replaying */
    this.snapshotsVm = null

    /** Mutation history */
    this.mutations = null
    /** Last replayed state */
    this.lastState = null
    /** Currently registered dynamic modules */
    this.registeredModules = {}
    /** All dynamic modules ever registered, useful for mutation replaying */
    this.allTimeModules = {}
    /** Legacy base state */
    this.legacyBaseSnapshot = { info: null, str: '' }

    // First-time snapshot VM creation
    this.resetSnapshotsVm()
    // Initial setup
    this.reset()

    // Override dynamic module handling in vuex
    if (this.store.registerModule) {
      this.origRegisterModule = this.store.registerModule.bind(this.store)
      this.store.registerModule = (path, module, options) => {
        this.addModule(path, module, options)
        this.origRegisterModule(path, module, options)
        if (!isProd) console.log('register module', path)
      }

      this.origUnregisterModule = this.store.unregisterModule.bind(this.store)
      this.store.unregisterModule = path => {
        this.removeModule(path)
        this.origUnregisterModule(path)
        if (!isProd) console.log('unregister module', path)
      }
    } else {
      this.origRegisterModule = this.origUnregisterModule = () => {}
    }

    // Register modules that were added before backend was created
    this.earlyModules.forEach(({ path, module, options }) => {
      const moduleInfo = this.addModule(path, module, options)
      moduleInfo.early = true
    })

    // deal with multiple backend injections
    hook.off('vuex:mutation')

    // application -> devtool
    const onMutation = debounce((...args) => this.onMutation(...args), 500) // onMutation比较耗时，不需要时间旅行，截流
    hook.on('vuex:mutation', onMutation)

    // devtool -> application
    bridge.on('vuex:travel-to-state', this.onTravelToState.bind(this))
    bridge.on('vuex:commit-all', this.onCommitAll.bind(this))
    bridge.on('vuex:revert-all', this.onRevertAll.bind(this))
    bridge.on('vuex:commit', this.onCommit.bind(this))
    bridge.on('vuex:revert', this.onRevert.bind(this))
    exBridge.on(api.vuex.importState, this.onImportState.bind(this))
    exBridge.on(api.vuex.inspectState, this.onInspectState.bind(this))
    bridge.on('vuex:edit-state', this.onEditState.bind(this))
  }

  /**
   * Register a mutation record
   */
  onMutation({ type, payload }) {
    if (!SharedData.recordVuex) return

    this.addMutation(type, payload)
  }

  /**
   * Time-travel to the state of a specific mutation (by index)
   */
  onTravelToState({ index, apply }) {
    const state = clone(this.lastState)
    if (apply) {
      this.ensureRegisteredModules(this.mutations[index])
      this.hook.emit('vuex:travel-to-state', state)
    }
  }

  onCommitAll() {
    this.reset(this.lastState)
  }

  onRevertAll() {
    this.reset()
  }

  /**
   * Reset the base state to a specific mutation (by index)
   *
   * ⚠️ State should be time-traveled to before executing this
   */
  onCommit(index) {
    this.legacyBaseSnapshot = this.mutations[index].snap
    this.mutations = this.mutations.slice(index + 1)
    this.mutations.forEach((mutation, index) => {
      mutation.index = index
    })
  }

  /**
   * Removes mutations after a specific mutation (by index)
   *
   * ⚠️ State should be time-traveled to before executing this
   */
  onRevert(index) {
    this.ensureRegisteredModules(this.mutations[index - 1])
    this.mutations = this.mutations.slice(0, index)
  }

  /**
   * Parse and time-travel to a state
   */
  onImportState(state) {
    const parsed = parse(state, true)
    this.initialState = parsed
    this.hook.emit('vuex:travel-to-state', parsed)
    this.reset()
    exBridge.send(api.vuex.init)

    return {
      index,
      snapshot: this.replayMutations(-1),
    }
  }

  /**
   * If the index is -1, sends the base state.
   * Else replays the mutations up to the <index> mutation.
   */
  onInspectState(index) {
    return {
      index,
      snapshot: this.replayMutations(index),
    }
  }

  onEditState({ index, value, path }) {
    let parsedValue
    if (value) {
      parsedValue = parse(value, true)
    }
    this.store._committing = true
    set(this.store.state, path, parsedValue)
    this.store._committing = false
    sendChunk(api.vuex.inspectedState, {
      index,
      snapshot: stringify(this.snapshotStore()),
    })
  }

  /**
   * Should be called when store structure changes,
   * for example when a dynamic module is registered
   */
  resetSnapshotsVm(state) {
    this.snapshotsVm = new Vue({
      data: {
        $$state: state || {},
      },
      computed: this.store._vm.$options.computed,
    })
  }

  /**
   * Reset vuex backend
   */
  reset() {
    if (SharedData.recordVuex) {
      if (!SharedData.vuexNewBackend) {
        this.legacyBaseSnapshot = { info: this.snapshotStore() }
      }
    }

    this.mutations = []
  }

  /**
   * Handle adding a dynamic store module
   */
  addModule(path, module, options) {
    if (typeof path === 'string') path = [path]

    let state
    if (options && options.preserveState) {
      state = get(this.store.state, path)
    }
    if (!state) {
      state = typeof module.state === 'function' ? module.state() : module.state
    }
    if (!state) {
      state = {}
    }

    const fakeModule = {
      ...module,
    }

    if (SharedData.vuexNewBackend) {
      // Ensure all children state are cloned
      const tranverseModule = function (rootModule, callback) {
        if (!rootModule.modules) {
          return
        }
        Object.entries(rootModule.modules).forEach(([modKey, currModule]) => {
          callback({ currModule, modKey })
        })
      }
      tranverseModule(fakeModule, function ({ currModule, modKey }) {
        let state = {}
        if (currModule.state) {
          state = typeof currModule.state === 'function' ? currModule.state() : currModule.state
        }
        currModule.state = clone(state)
      })
    }

    const key = path.join('/')
    const moduleInfo = {
      path,
      module: fakeModule,
      options: {
        ...options,
        preserveState: false,
      },
      state: SharedData.vuexNewBackend ? clone(state) : null,
    }
    this.registeredModules[key] = moduleInfo
    this.allTimeModules[key] = moduleInfo

    if (SharedData.recordVuex) {
      this.addMutation(
        `Register module: ${key}`,
        {
          path,
          module,
          options,
        },
        {
          registerModule: true,
        }
      )
    }

    return moduleInfo
  }

  /**
   * Handle removing a dynamic store module
   */
  removeModule(path) {
    if (typeof path === 'string') path = [path]

    delete this.registeredModules[path.join('/')]

    if (SharedData.recordVuex) {
      this.addMutation(
        `Unregister module: ${path.join('/')}`,
        {
          path,
        },
        {
          unregisterModule: true,
        }
      )
    }
  }

  /**
   * Make sure all (and only) the dynamic modules present at the moment of a mutation
   * are correctly registered in the store
   */
  ensureRegisteredModules(mutation) {
    if (mutation) {
      mutation.registeredModules.forEach(m => {
        if (
          !Object.keys(this.registeredModules)
            .sort((a, b) => a.length - b.length)
            .includes(m)
        ) {
          const data = this.allTimeModules[m]
          if (data) {
            const { path, module, options, state } = data
            this.origRegisterModule(
              path,
              {
                ...module,
                state: clone(state),
              },
              options
            )
            this.registeredModules[path.join('/')] = data
          }
        }
      })
      Object.keys(this.registeredModules)
        .sort((a, b) => b.length - a.length)
        .forEach(m => {
          if (!mutation.registeredModules.includes(m)) {
            this.origUnregisterModule(m.split('/'))
            delete this.registeredModules[m]
          }
        })
      this.resetSnapshotsVm(this.store.state)
    }
  }

  /**
   * Check if the store as a specific dynamic module
   */
  hasModule(path) {
    return !!this.store._modules.get(path)
  }

  snapshotStore() {
    const snapshot = {
      state: this.store.state,
      getters: getCatchedGetters(this.store),
      modules: Object.keys(this.store._modulesNamespaceMap || {})
        .map(m => m.substr(0, m.length - 1))
        .sort(),
    }

    return cloneVueData(snapshot)
  }

  /**
   * Handle a new mutation commited to the store
   */
  addMutation(type, payload, options = {}) {
    const index = this.mutations.length

    this.mutations.push({
      type,
      payload: SharedData.vuexNewBackend ? clone(payload) : null,
      index,
      handlers: this.store._mutations[type],
      registeredModules: Object.keys(this.registeredModules),
      ...options,
      snap: {
        info: this.snapshotStore(),
        str: '',
      },
    })

    sendChunk(api.vuex.mutation, {
      mutation: {
        type: type,
        payload: stringify(payload),
        index,
      },
      timestamp: Date.now(),
      options,
    })
  }

  /**
   * Replays mutations from the base state up to a specific index
   * to re-create what the vuex state should be at this point
   */
  replayMutations(index) {
    const snap = index === -1 ? this.legacyBaseSnapshot : this.mutations[index].snap
    if (!snap.str) {
      snap.str = stringify(snap.info)
    }
    this.lastState = snap.info.state
    return snap.str
  }
}

// 新版代码挪到这里，比较长
class VuexBackendNew extends VuexBackend {
  constructor(...args) {
    super(...args)
    /** Initial snapshot */
    this.baseStateSnapshot = null
    /** Snapshot cache */
    this.stateSnapshotCache = null
  }

  onCommit(...args) {
    super.onCommit(...args)
    if (SharedData.vuexNewBackend) {
      this.baseStateSnapshot = this.lastState
    }
    this.resetSnapshotCache()
  }
  onRevert(...args) {
    super.onRevert(...args)
    this.resetSnapshotCache()
  }
  onEditState({ index, value, path }) {
    super.onEditState({ index, value, path })
    this.cacheStateSnapshot(index, true)
  }
  reset(stateSnapshot = null) {
    super.reset()
    if (SharedData.recordVuex) {
      if (SharedData.vuexNewBackend) {
        this.baseStateSnapshot = stateSnapshot || clone(this.initialState)
      }
    }
    this.resetSnapshotCache()
  }

  replayMutations(index) {
    if (!SharedData.vuexNewBackend) {
      return super.replayMutations(index)
    } else {
      return this.replayMutationsNew(index)
    }
  }
  replayMutationsNew(index) {
    const originalVm = this.store._vm
    const originalState = clone(this.store.state)
    this.store._vm = this.snapshotsVm

    let tempRemovedModules = []
    let tempAddedModules = []

    // If base state, we need to remove all dynamic registered modules
    // to prevent errors because their state is missing
    if (index === -1) {
      tempRemovedModules = Object.keys(this.registeredModules)
      tempRemovedModules
        .filter(m => this.hasModule(m.split('/')))
        .sort((a, b) => b.length - a.length)
        .forEach(m => {
          this.origUnregisterModule(m.split('/'))
          if (!isProd) console.log('before replay unregister', m)
        })
    }

    // Get most recent snapshot for target index
    // for faster replay
    let stateSnapshot
    for (let i = 0; i < this.stateSnapshotCache.length; i++) {
      const s = this.stateSnapshotCache[i]
      if (s.index > index) {
        break
      } else {
        stateSnapshot = s
      }
    }

    let resultState

    // Snapshot was already replayed
    if (stateSnapshot.index === index) {
      resultState = stateSnapshot.state

      const state = clone(stateSnapshot.state)
      this.resetSnapshotsVm(state)
      this.store.replaceState(state)
    } else {
      // Update state when using fake vm to properly temporarily remove modules
      this.resetSnapshotsVm(originalState)
      this.store.replaceState(originalState)
      // Temporarily remove modules if they where not present during first mutation being replayed
      const startMutation = this.mutations[stateSnapshot.index]
      if (startMutation) {
        tempRemovedModules = Object.keys(this.registeredModules).filter(
          m => !startMutation.registeredModules.includes(m)
        )
      } else {
        tempRemovedModules = Object.keys(this.registeredModules)
      }
      tempRemovedModules
        .filter(m => this.hasModule(m.split('/')))
        .sort((a, b) => b.length - a.length)
        .forEach(m => {
          this.origUnregisterModule(m.split('/'))
          if (!isProd) console.log('before replay unregister', m)
        })

      const state = clone(stateSnapshot.state)
      this.resetSnapshotsVm(state)
      this.store.replaceState(state)

      SharedData.snapshotLoading = true

      // Replay mutations
      for (let i = stateSnapshot.index + 1; i <= index; i++) {
        const mutation = this.mutations[i]
        if (mutation.registerModule) {
          const key = mutation.payload.path.join('/')
          const moduleInfo = this.allTimeModules[key]
          tempAddedModules.push(key)
          this.origRegisterModule(
            moduleInfo.path,
            {
              ...moduleInfo.module,
              state: clone(moduleInfo.state),
            },
            moduleInfo.options
          )
          this.resetSnapshotsVm(this.store.state)
          if (!isProd) console.log('replay register module', moduleInfo)
        } else if (mutation.unregisterModule && this.hasModule(mutation.payload.path)) {
          const path = mutation.payload.path
          const index = tempAddedModules.indexOf(path.join('/'))
          if (index !== -1) tempAddedModules.splice(index, 1)
          this.origUnregisterModule(path)
          this.resetSnapshotsVm(this.store.state)
          if (!isProd) console.log('replay unregister module', path)
        } else if (mutation.handlers) {
          this.store._committing = true
          try {
            let payload = mutation.payload

            if (this.isLegacy && !Array.isArray(payload)) {
              payload = [payload]
            }

            if (Array.isArray(mutation.handlers)) {
              if (this.isLegacy) {
                mutation.handlers.forEach(handler => handler(this.store.state, ...payload))
              } else {
                mutation.handlers.forEach(handler => handler(payload))
              }
            } else {
              if (this.isLegacy) {
                mutation.handlers(this.store.state, ...payload)
              } else {
                mutation.handlers(payload)
              }
            }
          } catch (e) {
            throw e
          }
          this.store._committing = false
        }

        // Optimization: periodically cache snapshots
        if (i === index || i % SharedData.cacheVuexSnapshotsEvery === 0) {
          this.cacheStateSnapshot(i)
        }
      }

      // Send final state after replay
      resultState = clone(this.store.state)

      if (!isProd) console.log(`replayed ${index - stateSnapshot.index} mutation(s)`)
    }

    this.lastState = resultState

    const result = stringify(this.snapshotStore())

    // Restore user state
    tempAddedModules
      .sort((a, b) => b.length - a.length)
      .forEach(m => {
        this.origUnregisterModule(m.split('/'))
        if (!isProd) console.log('after replay unregister', m)
      })
    tempRemovedModules
      .sort((a, b) => a.length - b.length)
      .forEach(m => {
        const { path, module, options, state } = this.registeredModules[m]
        this.origRegisterModule(
          path,
          {
            ...module,
            state: clone(state),
          },
          options
        )
        if (!isProd) console.log('after replay register', m)
      })
    this.store._vm = originalVm

    return result
  }

  resetSnapshotCache() {
    this.stateSnapshotCache = [
      {
        index: -1,
        state: this.baseStateSnapshot,
        permanent: true,
      },
    ]
  }

  cacheStateSnapshot(index, permanent = false) {
    this.removeCachedStateSnapshot(index)
    this.stateSnapshotCache.push({
      index,
      state: clone(this.store.state),
      permanent,
    })
    if (!isProd) console.log('cached snapshot', index)
    // Delete old cached snapshots
    if (this.stateSnapshotCache.filter(s => !s.permanent).length > SharedData.cacheVuexSnapshotsLimit) {
      const i = this.stateSnapshotCache.findIndex(s => !s.permanent)
      if (i !== -1) {
        if (!isProd) console.log('clean cached snapshot', this.stateSnapshotCache[i].index)
        this.stateSnapshotCache.splice(i, 1)
      }
    }
  }

  removeCachedStateSnapshot(index) {
    const i = this.stateSnapshotCache.findIndex(s => s.idex === index)
    if (i !== -1) this.stateSnapshotCache.splice(i, 1)
  }
}

// 打开开关后再进行记录
let vuexBackend
watch(
  () => SharedData.recordVuex,
  function (n, o) {
    if (n && !o) {
      vuexBackend?.reset()
    }
  }
)
export function initVuexBackend(hook, bridge, isLegacy) {
  vuexBackend = new VuexBackendNew(hook, bridge, isLegacy)
  window.vuexBackend = vuexBackend
}

function getCatchedGetters(store) {
  const getters = {}

  const origGetters = store.getters || {}
  const keys = Object.keys(origGetters)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    Object.defineProperty(getters, key, {
      enumerable: true,
      get: () => {
        try {
          return origGetters[key]
        } catch (e) {
          return e
        }
      },
    })
  }

  return getters
}

export function getCustomStoreDetails(store) {
  return {
    _custom: {
      type: 'store',
      display: 'Store',
      value: {
        state: store.state,
        getters: getCatchedGetters(store),
      },
      fields: {
        abstract: true,
      },
    },
  }
}

// 发送数据量大，使用chunk
const sendChunk = function (path, params) {
  return exBridge.send(path, params, { chunk: { size: exBridge.CHUNK_SIZE } })
}
