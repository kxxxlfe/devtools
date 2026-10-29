import { bridge, api } from '@back/bridge'
import { installToast } from '@back/toast'
import { detectVue, envs } from '@vue-devtools/shared-utils'

let detectRes = {
  devtoolsForceEnabled: localStorage.getItem('_VUE_DEVTOOLS_FORCE_ENABLED') === 'true',
}
const initDetectRes = function ({ version, devtoolsEnabled, ...others }: any) {
  Object.assign(detectRes, {
    ...others,
    devtoolsEnabled,
    vueVersion: version,
    vueDetected: !!version,
  })
}

function detect(win) {
  setTimeout(async () => {
    // Method 1: Check Nuxt.js
    let env

    const { __NUXT__, $nuxt } = win
    const nuxtDetected = Boolean(__NUXT__ || $nuxt)
    if (nuxtDetected) {
      const Vue = $nuxt?.$root?.constructor
      if (Vue?.version?.startsWith('2.')) {
        env = envs.vue2.makeEnv(Vue)
      }
    }

    // Nuxt payloads alone do not identify Vue. Nuxt 3+ also needs DOM detection.
    env = env || (await detectVue()) || {}

    if (env.version) {
      const { version, devtoolsEnabled } = env
      VueRecord = env
      // 每次检测到Vue，直接分发出去
      const hook = globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__
      if (hook) {
        if (devtoolsEnabled || detectRes.devtoolsForceEnabled) {
          enableDevtools()
          if (!hook.store && env?.store) {
            hook.emit('vuex:init', env?.store)
          }
        }
      }
      initDetectRes({ version, devtoolsEnabled, nuxtDetected })
      bridge.send(api.back.vueDetectResult, detectRes)
    }
  }, 100)
}

bridge.on(api.web.fetchVueDetect, function () {
  return detectRes
})

// 暂时只有vue2支持
let VueRecord
const enableDevtools = function () {
  if (VueRecord.Vue) {
    VueRecord.Vue.config.devtools = true
  }
  const hook = globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__
  if (!hook.env?.devtoolsEnabled) {
    // 同步检测时保存的状态，确保 backend 扫描时能够收集根组件。
    VueRecord.devtoolsEnabled = true
    hook.env = VueRecord
    hook.emit('horse:init')
  }
}
bridge.on(api.web.changeDevtoolsEnable, function (isEnable) {
  detectRes.devtoolsForceEnabled = isEnable
  localStorage.setItem('_VUE_DEVTOOLS_FORCE_ENABLED', isEnable)
  // open devtools
  if (isEnable && VueRecord?.Vue) {
    enableDevtools()
  }
})

// inject the hook
if (document instanceof HTMLDocument) {
  detect(window)
  installToast(window)
}
