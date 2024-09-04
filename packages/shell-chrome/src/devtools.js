// this script is called when the VueDevtools panel is activated.

import { initDevTools } from '@front'
import Bridge from '@utils/bridge'

let port
let disconnected
const createPort = function() {
  disconnected = false
  port = chrome.runtime.connect({
    name: '' + chrome.devtools.inspectedWindow.tabId,
  })
  port.onDisconnect.addListener((...args) => {
    console.log('disconnected service-worker', args, chrome.runtime.lastError)
    disconnected = true
  })
}
window.createPort = createPort
chrome.tabs.onActivated.addListener(function({ tabId }) {
  if (tabId !== chrome.devtools.inspectedWindow.tabId) {
    return
  }
  // 聚焦重连
  if (port && disconnected) {
    createPort()
  }
})

initDevTools({
  /**
   * Inject backend, connect to background, and send back the bridge.
   *
   * @param {Function} cb
   */

  connect(cb) {
    // 1. inject backend code into page
    injectScript(chrome.runtime.getURL('build/backend.js'), () => {
      // 2. connect to background to setup proxy
      createPort()

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
    })
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

function injectScript(scriptName, cb) {
  const src = `
    (function() {
      var script = document.constructor.prototype.createElement.call(document, 'script');
      script.src = "${scriptName}";
      document.documentElement.appendChild(script);
      script.parentNode.removeChild(script);
    })()
  `
  chrome.devtools.inspectedWindow.eval(src, function(res, err) {
    if (err) {
      console.log(err)
    }
    cb()
  })
}
