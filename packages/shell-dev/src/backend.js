import { initBackend } from '@vue-devtools/app-backend'
import Bridge from '@utils/bridge'

const bridge = new Bridge({
  listen(fn) {
    window.addEventListener('message', evt => fn(evt.data))
  },
  send(data) {
    console.log('backend -> devtools', data)
    window.parent.postMessage(data, '*')
  },
})

initBackend(bridge)
