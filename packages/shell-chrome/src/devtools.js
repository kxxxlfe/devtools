// this script is called when the VueDevtools panel is activated.

import { initDevTools } from '@front'
import Bridge from '@utils/bridge'
import { waitTime } from '@utils/tools'
import '@utils/ext-bridge/devtool'

initDevTools({
  /**
   * Inject backend, connect to background, and send back the bridge.
   *
   * @param {Function} cb
   */

  async connect(cb) {
    // 1. inject backend code into page
    await injectScript(chrome.runtime.getURL('build/backend.js'))

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
  await waitTime(200) // wait page loaded
  const src = `
    (function() {
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
