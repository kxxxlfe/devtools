/* 
  web环境：content <=> web
*/
import { MsgDef, Plat, APIHandler, makeRequest, makeResponse, isBridgeMessage, EventHandle } from './const'

class DevBridge extends EventHandle {
  callbacks = {}
  plat = Plat.devtool
  tabId = chrome.devtools.inspectedWindow.tabId
  Plat = Plat

  constructor() {
    super()
    this.onRequest = this.onRequest.bind(this)
    chrome.runtime.onMessage.addListener(this.onRequest)
  }

  send(path, params) {
    const msg = makeRequest({ plat: this.plat, path, params })
    console.log(path, msg.uuid)
    return chrome.tabs.sendMessage(this.tabId, msg, {})
  }
  request(path, params) {
    const msg = makeRequest({ plat: this.plat, path, params })
    msg.needResponse = true
    console.log(path, msg.uuid)
    return chrome.tabs.sendMessage(this.tabId, msg, {})
  }
  // 处理请求，负责返回
  async onRequest(msgdata, sender, sendResponse) {
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
    sendResponse(makeResponse({ plat: this.plat, data: res, request }))
  }
}

export const bridge = new DevBridge()

window.devtoolBridge = bridge
window.test = async function () {
  const res = await bridge.request(`${Plat.web}/test`, { aaa: 1 })
  console.log(res)
}
bridge.on(`${Plat.devtool}/test`, function (info) {
  console.log('web request: ', info)
  return { result: 'devtool ok' }
})
