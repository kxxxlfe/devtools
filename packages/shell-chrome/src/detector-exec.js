import { bridge, api } from '@back/bridge'
import { installToast } from '@back/toast'
import { detectVue } from '@utils/tools'

let detectRes = {
  devtoolsForceEnabled: localStorage.getItem('_VUE_DEVTOOLS_FORCE_ENABLED') === 'true',
}
const initDetectRes = function ({ Vue, devtoolsEnabled, ...others }) {
  Object.assign(detectRes, {
    ...others,
    devtoolsEnabled: devtoolsEnabled === undefined ? Vue?.config.devtools : devtoolsEnabled,
    vueVersion: Vue?.version,
    vueDetected: !!Vue,
  })
}

let VueRecord

const enableDevtools = function (Vue) {
  Vue.config.devtools = true
  const hook = globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__
  if (!hook.Vue) {
    hook.Vue = Vue
    hook.emit('init', Vue)
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
        VueRecord = Vue
      }

      initDetectRes({ Vue, nuxtDetected: true })
      bridge.send(api.back.vueDetectResult, detectRes)

      return
    }

    // Method 2: Scan all elements inside document
    const { Vue, store } = detectVue()

    if (Vue) {
      VueRecord = Vue
      const devtoolsEnabled = Vue.config.devtools
      // 每次检测到Vue，直接分发出去
      const hook = globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__
      if (hook) {
        if (Vue.config.devtools || detectRes.devtoolsForceEnabled) {
          if (!hook.Vue) {
            enableDevtools(Vue)
          }
          if (!hook.store) {
            hook.emit('vuex:init', store)
          }
        }
      }
      initDetectRes({ Vue, devtoolsEnabled })
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
  // open devtools
  if (isEnable && VueRecord) {
    enableDevtools(VueRecord)
  }
})

// inject the hook
if (document instanceof HTMLDocument) {
  detect(window)
  installToast(window)
}
