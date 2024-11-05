/* 
  web环境：content <=> web
*/
import { MsgDef, Plat, APIHandler, makeRequest, makeResponse, isBridgeMessage, EventHandle } from './const'

class DevBridge extends EventHandle {
  callbacks = {}
  plat = Plat.devtool
  tabId = chrome.devtools.inspectedWindow.tabId

  constructor() {
    super()
    chrome.runtime.onMessage.removeListener(this.onRequest)
    chrome.runtime.onMessage.addListener(this.onRequest)
  }

  request(path, params) {
    const msg = makeRequest({ plat: this.plat, path, params })

    return chrome.tabs.sendMessage(this.tabId, msg, {})
  }
  // 处理请求，负责返回
  async onRequest(evt) {
    const { data: msgdata } = evt
    if (!isBridgeMessage(msgdata)) {
      return
    }
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
    chrome.tabs.sendMessage(this.tabId, makeResponse({ data: res, request }))
  }
}

export const bridge = new DevBridge()
