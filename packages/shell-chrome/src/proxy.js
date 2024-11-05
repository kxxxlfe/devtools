// This is a content-script that is injected only when the devtools are
// activated. Because it is not injected using eval, it has full privilege
// to the chrome runtime API. It serves as a proxy between the injected
// backend and the Vue devtools panel.

function sendMessageToBackend(payload) {
  window.postMessage(
    {
      source: 'vue-devtools-proxy',
      payload: payload,
    },
    '*'
  )
}

function sendMessageToDevtools(e) {
  if (e.data && e.data.source === 'vue-devtools-backend') {
    port.postMessage(e.data.payload)
  } else if (e.data && e.data.source === 'vue-devtools-backend-injection') {
    if (e.data.payload === 'listening') {
      sendMessageToBackend('init')
    }
  }
}

let port
let disconnected = false
const connect2ServiceWorker = function() {
  disconnected = false
  port = chrome.runtime.connect({
    name: 'content-script',
  })
  port.onMessage.addListener(sendMessageToBackend)
  window.addEventListener('message', sendMessageToDevtools)
  port.onDisconnect.addListener(function(...args) {
    console.log('disconnect service-worker', args, Date().toString())
    disconnected = true
    window.removeEventListener('message', sendMessageToDevtools)
    sendMessageToBackend('shutdown')
    if (document.visibilityState === 'visible') {
      console.log('reconnect service-worker', Date().toString())
      connect2ServiceWorker()
    }
  })
  sendMessageToBackend('init')
}

connect2ServiceWorker()

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible' && disconnected) {
    console.log('reconnect service-worker', Date().toString())
    connect2ServiceWorker()
  }
})
