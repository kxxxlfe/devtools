/* 
  web环境：content <=> web
*/
import { MsgDef, Plat, EventHandle, makeRequest, makeResponse, makeWinPost } from './const'

class WebBridge extends EventHandle {
  callbacks = {}
  plat = Plat.web

  constructor() {
    super()
    window.removeEventListener('message', this.onRequest)
    window.addEventListener('message', this.onRequest)
  }

  request(path, params) {
    const msg = makeRequest({ plat: this.plat, path, params })

    return makeWinPost(msg)
  }
  // 处理请求，负责返回
  async onRequest(evt) {
    const { data: msgdata } = evt
    if (!msgdata.targetPlat?.startsWith(this.plat)) {
      return
    }
    const uuid = msgdata.uuid

    if (msgdata.type !== MsgDef.request) {
      return
    }

    const request = msgdata
    const { path, params } = request
    const res = await this.trigger(path, params)
    window.postMessage(makeResponse({ data: res, request }))
  }
}

export const bridge = new WebBridge()

window.webBridge = bridge
window.testBridge = function() {
  bridge.request(`${Plat.devtool}/test`, { from: 'web' })
}
bridge.on(`${Plat.web}/test`, function(info) {
  console.log(info)
  return { result: 'ok' }
})
