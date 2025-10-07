import { ref, shallowRef } from 'vue'
import { bridge as exBridge, api, eventBus } from '@front/bridge'
import SharedData from '@utils/shared-data'
import { parse } from '@utils/util'
import { snapshotsCache } from './cache'
import { reset } from './module'

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
}
// 获取index对应的数据
const loadStateByIndex = async function ({ index }) {
  SharedData.snapshotLoading = true
  updateInspectedState(null)
  const { snapshot } = await exBridge.requestChunk(api.vuex.inspectState, index)
  loadInspectedState({ index, snapshot })
  requestAnimationFrame(() => {
    SharedData.snapshotLoading = false
  })

  return { snapshot }
}
exBridge.on(api.vuex.inspectedState, loadInspectedState)

// type Snapshot = { state: {}, getters: {} }
export const base = shallowRef(null)
export const inspectedState = shallowRef(null) // 当前状态
export const lastReceivedState = shallowRef(null)
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
  return { hasVuex, base, inspectedState, updateInspectedState, lastReceivedState, parseStoreState, loadStateByIndex }
}
