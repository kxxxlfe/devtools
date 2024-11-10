/* 
  web环境：content <=> web
*/
import { MsgDef, Plat, EventHandle, makeRequest, makeResponse, WinPost, isBridgeMessage } from './const'

const win = new WinPost({ plat: Plat.web })

class WebBridge extends EventHandle {
  callbacks = {}
  plat = Plat.web
  Plat = Plat

  constructor() {
    super()
    this.onRequest = this.onRequest.bind(this)
    window.addEventListener('message', this.onRequest)
  }

  request(path, params) {
    const msg = makeRequest({ plat: this.plat, path, params })

    return win.post(msg)
  }
  // 处理请求，负责返回
  async onRequest(evt) {
    const msgdata = win.parseMsg(evt.data)
    if (!isBridgeMessage(msgdata)) {
      return
    }
    if (!msgdata.target?.startsWith(this.plat)) {
      return
    }
    const uuid = msgdata.uuid

    if (msgdata.type !== MsgDef.request) {
      return
    }

    const request = msgdata
    const { path, params } = request
    const res = await this.trigger(path, params)
    win.response({ request: evt.data, response: makeResponse({ plat: this.plat, data: res, request }) })
  }
}

export const bridge = new WebBridge()

window.webBridge = bridge
window.testBridge = async function () {
  const res = await bridge.request(`${Plat.devtool}/test`, { from: 'web' })
  console.log('response', res)
}
bridge.on(`${Plat.web}/test`, function (info) {
  console.log(info)
  return { result: 'web ok' }
})
