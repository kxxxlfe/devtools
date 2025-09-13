import Vue from 'vue'
import AppConnecting from './AppConnecting.vue'
import App from './App.vue'
import router from './router'
import { createStore } from './store'
import { useApp } from './store/useApp'
import * as filters from './filters'
import './plugins'
import './plugins/usePanelStatus'
import VuexResolve from './views/vuex/resolve'
import { useEvents } from './views/events/useEvents'
import './views/routes/useRoutes'
import './views/router/useRouter'
import './views/vuex/useVuex'
import './views/components/useComponent'
import { isChrome, initEnv } from '@utils/env'
import SharedData, { init as initSharedData } from '@utils/shared-data'
import { init as initStorage } from '@utils/storage'
import { bridge as exBridge, api } from '@front/bridge'

// register filters
for (const key in filters) {
  Vue.filter(key, filters[key])
}

// UI

const chromeTheme = isChrome ? chrome.devtools.panels.themeName : undefined
const isBeta = process.env.RELEASE_CHANNEL === 'beta'

// Capture and log devtool errors when running as actual extension
// so that we can debug it by inspecting the background page.
// We do want the errors to be thrown in the dev shell though.
if (isChrome) {
  Vue.config.errorHandler = (e, vm) => {
    bridge.send('ERROR', {
      message: e.message,
      stack: e.stack,
      component: vm.$options.name || vm.$options._componentTag || 'anonymous',
    })
  }
}

Vue.options.renderError = (h, e) => {
  return h(
    'pre',
    {
      style: {
        backgroundColor: 'red',
        color: 'white',
        fontSize: '12px',
        padding: '10px',
      },
    },
    e.stack
  )
}

let app = new Vue({
  render: h => h(AppConnecting),
}).$mount('#app')

/**
 * Create the main devtools app. Expects to be called with a shell interface
 * which implements a connect method.
 *
 * @param {Object} shell
 *        - connect(bridge => {})
 *        - onReload(reloadFn)
 */

export function initDevTools(shell) {
  initStorage().then(() => {
    initApp(shell)
    shell.onReload(() => {
      if (app) {
        app.$el.classList.add('disconnected')
        app.$destroy()
      }
      bridge.removeAllListeners()
      initApp(shell)
    })
  })
}

/**
 * Connect then init the app. We need to reconnect on every reload, because a
 * new backend will be injected.
 *
 * @param {Object} shell
 */

const { enabled: eventsEnabled } = useEvents()

function initApp(shell) {
  const { updateHeaderMsg } = useApp()

  shell.connect(bridge => {
    window.bridge = bridge
    Vue.prototype.$shared = SharedData

    initSharedData({
      exBridge,
      Vue,
      persist: true,
    }).then(() => {
      if (SharedData.logDetected) {
        exBridge.send(api.web.log, { type: 'log-detected-vue' })
      }

      const store = createStore()
      window.store = store

      bridge.once('ready', version => {
        updateHeaderMsg(`Ready. Detected Vue ${version} .`)
      })

      bridge.once('proxy-fail', () => {
        updateHeaderMsg(`Proxy injection failed.`)
      })

      initEnv(Vue)

      if (app) {
        app.$destroy()
      }

      app = new Vue({
        extends: App,
        router,
        store,

        data: {
          isBeta,
        },

        watch: {
          '$shared.theme': {
            handler(value) {
              if (value === 'dark' || value === 'high-contrast' || (value === 'auto' && chromeTheme === 'dark')) {
                document.body.classList.add('vue-ui-dark-mode')
              } else {
                document.body.classList.remove('vue-ui-dark-mode')
              }
              if (value === 'high-contrast') {
                document.body.classList.add('vue-ui-high-contrast')
              } else {
                document.body.classList.remove('vue-ui-high-contrast')
              }
            },
            immediate: true,
          },
        },
      }).$mount('#app')
    })
  })
}
