import { ref } from 'vue'
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

exBridge.on(api.vuex.inspectedState, ({ index, snapshot }) => {
  const store = window.store
  store.commit('vuex/RECEIVE_STATE', { index, snapshot })

  if (index === -1) {
    store.commit('vuex/UPDATE_BASE_STATE', snapshot)
  } else if (store.getters['vuex/absoluteInspectedIndex'] === index) {
    store.commit('vuex/UPDATE_INSPECTED_STATE', snapshot)
  } else {
    console.log('vuex:inspected-state wrong index', index, 'expected:', store.getters['vuex/absoluteInspectedIndex'])
  }

  VuexResolve.travel?.(snapshot)

  requestAnimationFrame(() => {
    SharedData.snapshotLoading = false
  })
})

export const useVuex = function () {
  return { hasVuex }
}
