// router: 页面跳转时触发
import { ref, computed, set } from 'vue'
import { bridge as exBridge, api } from '@front/bridge'
import { useSharedData } from '@utils/shared-data'
import { parse } from '@utils/util'

// router
exBridge.on(api.router.init, payload => {
  window.store.commit('router/INIT', parse(payload))
})

exBridge.on(api.router.changed, payload => {
  window.store.commit('router/CHANGED', parse(payload))
})

export const useRouter = function () {
  const { updateSharedData, sharedData } = useSharedData()

  const toggleRecording = function () {
    updateSharedData({ recordRouter: !recordRouter.value })
  }

  const recordRouter = computed(() => {
    return sharedData.value.recordRouter
  })

  return { toggleRecording, recordRouter }
}
