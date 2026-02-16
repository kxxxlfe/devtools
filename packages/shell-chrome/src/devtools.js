// this script is called when the VueDevtools panel is activated.

import { debounce } from 'lodash-es'
import { initDevTools } from '@front'
import Bridge from '@utils/bridge'
import { waitTime } from '@utils/tools'

let connectLatestRunId = null

initDevTools({
  /**
   * Inject backend, connect to background, and send back the bridge.
   *
   * @param {Function} cb
   */

  async connect(cb) {
    connectLatestRunId = Date.now()
    const currRunId = connectLatestRunId
    await waitTime(500) // wait page loaded
    if (currRunId !== connectLatestRunId) {
      return console.log('connect run repeat, reload too fast, will ignore', currRunId, connectLatestRunId)
    }
    // 1. inject backend code into page
    await injectScript(chrome.runtime.getURL('src/backend.js'))

    // 2. connect to background to setup proxy
    const port = chrome.runtime.connect({
      name: '' + chrome.devtools.inspectedWindow.tabId,
    })
    let disconnected = false
    port.onDisconnect.addListener(() => {
      disconnected = true
    })

    const bridge = new Bridge({
      listen(fn) {
        port.onMessage.addListener(fn)
      },
      send(data) {
        if (!disconnected) {
          // if (process.env.NODE_ENV !== 'production') {
          //   console.log('[chrome] devtools -> backend', data)
          // }
          port.postMessage(data)
        }
      },
    })
    // 3. send a proxy API to the panel
    cb(bridge)
  },

  /**
   * Register a function to reload the devtools app.
   *
   * @param {Function} reloadFn
   */

  onReload(reloadFn) {
    chrome.devtools.network.onNavigated.addListener(reloadFn)
  },
})

/**
 * Inject a globally evaluated script, in the same context with the actual
 * user app.
 *
 * @param {String} scriptName
 * @param {Function} cb
 */

async function injectScript(scriptName) {
  const src = `
    (function() {
      if (globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__?.injectBackend?.()) {
        return
      }
      var script = document.constructor.prototype.createElement.call(document, 'script');
      script.src = "${scriptName}";
      document.documentElement.appendChild(script);
      script.parentNode.removeChild(script);
    })()
  `

  return new Promise(resolve => {
    chrome.devtools.inspectedWindow.eval(src, function (res, err) {
      if (err) {
        console.log(err)
      }
      resolve()
    })
  })
}
