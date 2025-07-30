import { ref } from 'vue'
import { bridge as exBridge, api } from '@front/bridge'
import { snapshotsCache } from './cache'
import { reset } from './module'

const hasVuex = ref(false)
exBridge.on(api.vuex.init, args => {
  hasVuex.value = true
  snapshotsCache.reset()
  reset(window.store.state.vuex)
})

export const useVuex = function () {
  return { hasVuex }
}
