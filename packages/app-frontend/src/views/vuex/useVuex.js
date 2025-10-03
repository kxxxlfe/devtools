import { ref, shallowRef } from 'vue'
import { bridge as exBridge, api, eventBus } from '@front/bridge'
import SharedData from '@utils/shared-data'
import { snapshotsCache } from './cache'
import { reset } from './module'
import VuexResolve from './resolve'

const hasVuex = ref(false)
exBridge.on(api.vuex.init, args => {
  hasVuex.value = true
  snapshotsCache.reset()
  reset(window.store.state.vuex)
})

// 旧的事件
exBridge.on(api.vuex.mutation, payload => {
  window.store.dispatch('vuex/receiveMutation', payload)
  eventBus.$emit('onVuexMutation', payload)
})

exBridge.on(api.vuex.inspectedState, loadInspectedState)
const loadInspectedState = ({ index, snapshot }) => {
  const store = window.store
  lastReceivedState.value = parseStoreState(snapshot) // RECEIVE_STATE
  snapshotsCache.set(index, snapshot)

  const absoluteInspectedIndex = store.getters['vuex/absoluteInspectedIndex']
  if (index === -1) {
    base.value = parseStoreState(snapshot) // UPDATE_BASE_STATE
  } else if (absoluteInspectedIndex === index) {
    inspectedState.value = parseStoreState(snapshot) // UPDATE_INSPECTED_STATE
  } else {
    console.log('vuex:inspected-state wrong index', index, 'expected:', absoluteInspectedIndex)
  }

  VuexResolve.travel?.(snapshot)

  requestAnimationFrame(() => {
    SharedData.snapshotLoading = false
  })
}

// type Snapshot = { state: {}, getters: {} }
const base = shallowRef(null)
const inspectedState = shallowRef(null) // 当前状态
const lastReceivedState = shallowRef(null)
function parseStoreState(state) {
  const data = parse(state)
  if (data) {
    return {
      state: data.state,
      getters: Object.freeze(data.getters),
      modules: Object.freeze(data.modules),
    }
  }
}
const updateInspectedState = function (value) {
  inspectedState.value = parseStoreState(value)
}

export const useVuex = function () {
  return { hasVuex, base, inspectedState, updateInspectedState, lastReceivedState, parseStoreState, loadInspectedState }
}
