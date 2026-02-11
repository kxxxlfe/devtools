import { ref, shallowRef, reactive, computed } from 'vue'
import { debounce } from 'lodash-es'
import { bridge as exBridge, api, eventBus } from '@front/bridge'
import SharedData from '@utils/shared-data'
import { parse, get } from '@utils/util'
import { snapshotsCache } from './cache'

const ANY_RE = new RegExp('.*', 'i')
let uid = 0

// ============ Snapshot Refs ============
export const base = shallowRef(null)
const inspectedSnapshot = shallowRef(null)
export const lastReceivedState = shallowRef(null)

// ============ Reactive State ============
const state = reactive({
  inspectedIndex: -1,
  activeIndex: -1,
  history: [],
  initialCommit: Date.now(),
  lastCommit: Date.now(),
  filter: '',
  filterRegex: ANY_RE,
  filterRegexInvalid: false,
  inspectedModule: null,
})

// ============ Mutation Buffer ============
export const mutationBuffer = []

// ============ Helper Functions ============
function parseStoreState(stateStr) {
  const data = parse(stateStr)
  if (data) {
    return {
      state: data.state,
      getters: Object.freeze(data.getters),
      modules: Object.freeze(data.modules),
    }
  }
}

function escapeStringForRegExp(str) {
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

function processInspectedState({ entry, data, inspectedModule }) {
  const res = {}

  if (entry) {
    res.mutation = {
      type: entry.mutation.type,
      payload: entry.mutation.payload ? parse(entry.mutation.payload) : undefined,
    }
  }

  if (data) {
    res.state = data.state
    res.getters = data.getters

    if (inspectedModule) {
      res.state = get(res.state, inspectedModule.replace(/\//g, '.'))

      if (res.getters) {
        res.getters = Object.keys(res.getters)
          .filter(key => key.startsWith(inspectedModule))
          .reduce((obj, key) => {
            obj[key.substr(inspectedModule.length + 1)] = res.getters[key]
            return obj
          }, {})
      }
    }
  }

  if (SharedData.vuexGroupGettersByModule && res.getters) {
    const getterGroups = {}
    const keys = Object.keys(res.getters)
    keys.forEach(key => {
      const parts = key.split('/')
      let parent = getterGroups
      for (let p = 0; p < parts.length - 1; p++) {
        const part = `__vue__${parts[p]}`
        parent = parent[part] = parent[part] || {
          _custom: {
            value: {},
            abstract: true,
          },
        }
        parent = parent._custom.value
      }
      parent[parts.pop()] = res.getters[key]
    })
    res.getters = getterGroups
  }

  return res
}

function reset() {
  state.history = []
  state.inspectedIndex = state.activeIndex = -1
  inspectedSnapshot.value = null
  SharedData.snapshotLoading = false
}

// ============ Computed Getters ============
const filteredHistory = computed(() => {
  return state.history.filter(entry => state.filterRegex.test(entry.mutation.type))
})

const inspectedEntry = computed(() => {
  return filteredHistory.value[state.inspectedIndex]
})

const inspectedState = computed(() => {
  const entry = inspectedEntry.value
  const data = entry ? inspectedSnapshot.value : base.value
  return processInspectedState({ entry, data, inspectedModule: state.inspectedModule })
})

const inspectedLastState = computed(() => {
  const entry = inspectedEntry.value
  return processInspectedState({ entry, data: lastReceivedState.value, inspectedModule: state.inspectedModule })
})

const absoluteInspectedIndex = computed(() => {
  return state.history?.indexOf(inspectedEntry.value) ?? -1
})

const modules = computed(() => {
  const entry = inspectedEntry.value
  const data = entry ? inspectedSnapshot.value : base.value
  if (data) {
    return data.modules
  }
  return []
})

// ============ State Mutation Methods ============
function receiveMutationsCommit(entries) {
  const inspectingLastMutation = state.inspectedIndex === state.history.length - 1
  for (const entry of entries) {
    entry.id = uid++
  }
  state.history.push(...entries)
  if (!state.filter) {
    state.activeIndex = state.history.length - 1
    if (inspectingLastMutation) {
      state.inspectedIndex = state.activeIndex
      inspectedSnapshot.value = null
    }
  }
}

function commitAllState() {
  base.value = lastReceivedState.value
  state.lastCommit = Date.now()
  reset()
}

function revertAllState() {
  reset()
}

function commitByIndex(index) {
  base.value = lastReceivedState.value
  state.lastCommit = Date.now()
  state.history = state.history.slice(index + 1)
  state.history.forEach(({ mutation }, index) => {
    mutation.index = index
  })
  state.inspectedIndex = -1
}

function revertByIndex(index) {
  state.history = state.history.slice(0, index)
  state.inspectedIndex = state.history.length - 1
}

function setInspectedIndex(index) {
  state.inspectedIndex = index
}

function setActiveIndex(index) {
  state.activeIndex = index
}

function updateFilterState(filter) {
  state.filter = filter
  const regexParts = filter.match(/^\/((?:(?:.*?)(?:\\\/)?)*?)\/(\w*)/)
  if (regexParts !== null) {
    try {
      state.filterRegexInvalid = false
      state.filterRegex = new RegExp(regexParts[1], regexParts[2])
    } catch (e) {
      state.filterRegexInvalid = true
      state.filterRegex = ANY_RE
    }
  } else {
    state.filterRegexInvalid = false
    state.filterRegex = new RegExp(escapeStringForRegExp(filter), 'i')
  }
}

function setInspectedModule(module) {
  state.inspectedModule = module
}

// ============ Snapshot Operations ============
function updateInspectedState(value) {
  inspectedSnapshot.value = parseStoreState(value)
}

function loadInspectedState({ index, snapshot }) {
  lastReceivedState.value = parseStoreState(snapshot)
  snapshotsCache.set(index, snapshot)

  if (index === -1) {
    base.value = parseStoreState(snapshot)
  } else if (absoluteInspectedIndex.value === index) {
    inspectedSnapshot.value = parseStoreState(snapshot)
  } else {
    console.log('vuex:inspected-state wrong index', index, 'expected:', absoluteInspectedIndex.value)
  }
}

async function loadStateByIndex({ index }) {
  if (SharedData.snapshotLoading) {
    return
  }
  SharedData.snapshotLoading = true
  updateInspectedState(null)
  try {
    const { snapshot } = await exBridge.requestChunk(api.vuex.inspectState, index)
    loadInspectedState({ index, snapshot })
    requestAnimationFrame(() => {
      SharedData.snapshotLoading = false
    })
    return { snapshot }
  } finally {
    SharedData.snapshotLoading = false
  }
}

// ============ Action Methods ============
function receiveMutation(entry) {
  mutationBuffer.push(entry)
  receiveMutationsDebounced()
}

const receiveMutationsDebounced = debounce(
  () => {
    receiveMutationsCommit(mutationBuffer)
    mutationBuffer.length = 0
  },
  300,
  { maxWait: 1000 }
)

function commitAll() {
  if (state.history.length > 0) {
    travelTo(state.history.length - 1).then(() => {
      snapshotsCache.reset()
      exBridge.send('vuex:commit-all')
      commitAllState()
    })
  }
}

function revertAll() {
  if (state.history.length > 0) {
    travelTo(-1).then(() => {
      snapshotsCache.reset()
      exBridge.send('vuex:revert-all')
      revertAllState()
    })
  }
}

function commit(entry) {
  const index = state.history.indexOf(entry)
  if (index > -1) {
    travelTo(index, false).then(() => {
      snapshotsCache.reset()
      exBridge.send('vuex:commit', index)
      commitByIndex(index)
      travelTo(state.history.length - 1)
    })
  }
}

function revert(entry) {
  const index = state.history.indexOf(entry)
  if (index > -1) {
    travelTo(index - 1).then(() => {
      snapshotsCache.reset()
      exBridge.send('vuex:revert', index)
      revertByIndex(index)
    })
  }
}

async function inspect(entryOrIndex) {
  let index = typeof entryOrIndex === 'number' ? entryOrIndex : filteredHistory.value.indexOf(entryOrIndex)
  if (index < -1) index = -1
  if (index >= filteredHistory.value.length) index = filteredHistory.value.length - 1
  setInspectedIndex(index)

  const entry = filteredHistory.value[index]
  const mutationIndex = entry ? entry.mutation.index : -1
  const cached = snapshotsCache.get(mutationIndex)
  if (cached) {
    inspectedSnapshot.value = cached
    updateInspectedState(cached)
  } else {
    loadStateByIndex({ index: mutationIndex })
  }
}

function timeTravelTo(entry) {
  return travelTo(state.history.indexOf(entry))
}

function updateFilter(filter) {
  updateFilterState(filter)
}

async function editState({ path, args }) {
  const index = state.inspectedIndex
  if (index !== -1) snapshotsCache.del(index)
  const { snapshot } = await exBridge.requestChunk(api.vuex.editState, {
    index,
    path,
    ...args,
  })
  loadInspectedState({ index, snapshot })
}

async function travelTo(index, apply = true) {
  exBridge.send('vuex:travel-to-state', { index, apply })

  if (index !== state.inspectedIndex) {
    setInspectedIndex(index)
  }
  setActiveIndex(index)

  const result = await loadStateByIndex({ index })
  return result?.snapshot
}

// ============ Bridge Events ============
const hasVuex = ref(false)
exBridge.on(api.vuex.init, () => {
  hasVuex.value = true
  snapshotsCache.reset()
  reset()
})

exBridge.on(api.vuex.mutation, payload => {
  receiveMutation(payload)
  eventBus.$emit('onVuexMutation', payload)
})

// ============ Export ============
export const useVuex = function () {
  return {
    // Flags
    hasVuex,

    // State (reactive)
    state,

    // Computed getters
    filteredHistory,
    inspectedEntry,
    inspectedState,
    inspectedLastState,
    absoluteInspectedIndex,
    modules,

    // Snapshot refs
    base,
    lastReceivedState,

    // State mutations
    setInspectedModule,

    // Actions
    commitAll,
    revertAll,
    commit,
    revert,
    inspect,
    timeTravelTo,
    updateFilter,
    editState,

    // Snapshot operations
    updateInspectedState,
    loadInspectedState,
    loadStateByIndex,
    parseStoreState,

    // Buffer
    mutationBuffer,
  }
}
