import { installToast } from '@back/toast'
import { detectVue } from '@utils/tools'

function detect(win) {
  setTimeout(() => {
    // Method 1: Check Nuxt.js
    const nuxtDetected = Boolean(window.__NUXT__ || window.$nuxt)

    if (nuxtDetected) {
      let Vue

      if (window.$nuxt) {
        Vue = window.$nuxt.$root.constructor
      }

      win.postMessage(
        {
          devtoolsEnabled: Vue && Vue.config.devtools,
          vueDetected: true,
          nuxtDetected: true,
        },
        '*'
      )

      return
    }

    // Method 2: Scan all elements inside document
    const Vue = detectVue()
    if (Vue) {
      if (globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__ && !globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__.Vue) {
        globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__.Vue = Vue
      }
      win.postMessage(
        {
          devtoolsEnabled: Vue.config.devtools,
          vueDetected: true,
        },
        '*'
      )
    }
  }, 100)
}

// inject the hook
if (document instanceof HTMLDocument) {
  detect(window)
  installToast(window)
}
