import { bridge, api } from '@back/bridge'
import { installToast } from '@back/toast'
import { detectVue } from '@utils/tools'

let detectRes = {}
const initDetectRes = function ({ Vue, ...others }) {
  const devtoolsForceEnabled = localStorage.getItem('_VUE_DEVTOOLS_FORCE_ENABLED') === 'true'
  detectRes = {
    ...others,
    devtoolsEnabled: Vue?.config.devtools,
    vueVersion: Vue?.version,
    vueDetected: !!Vue,
    devtoolsForceEnabled,
  }
}

function detect(win) {
  setTimeout(() => {
    // Method 1: Check Nuxt.js
    const nuxtDetected = Boolean(window.__NUXT__ || window.$nuxt)

    if (nuxtDetected) {
      let Vue

      if (window.$nuxt) {
        Vue = window.$nuxt.$root.constructor
      }

      initDetectRes({ Vue, nuxtDetected: true })
      bridge.send(api.back.vueDetectResult, detectRes)

      return
    }

    // Method 2: Scan all elements inside document
    const Vue = detectVue()

    if (Vue) {
      // 每次检测到Vue，直接分发出去
      const hook = globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__
      if (hook && !hook.Vue && Vue.config.devtools) {
        hook.Vue = Vue
      }
      initDetectRes({ Vue })
      bridge.send(api.back.vueDetectResult, detectRes)
    }
  }, 100)
}

bridge.on(api.web.fetchVueDetect, function () {
  return detectRes
})

bridge.on(api.web.changeDevtoolsEnable, function (isEnable) {
  detectRes.devtoolsForceEnabled = isEnable
  localStorage.setItem('_VUE_DEVTOOLS_FORCE_ENABLED', isEnable)
})

// inject the hook
if (document instanceof HTMLDocument) {
  detect(window)
  installToast(window)
}
