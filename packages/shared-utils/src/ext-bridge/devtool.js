/* 
  web环境：content <=> web
*/
import { MsgDef, Plat, APIHandler, makeRequest, makeResponse, isBridgeMessage } from './const'

const callbacks = {}

// req/res 处理
chrome.runtime.onMessage.addEventListener(async (msgdata, source) => {
  if (!isBridgeMessage(msgdata)) {
    return
  }
  if (msgdata.source === Plat.devtool) {
    return
  }
  if (msgdata.type === MsgDef.request && !msgdata.path.startsWith(Plat.devtool)) {
    return
  }

  if (msgdata.type === MsgDef.response) {
    callbacks[uuid] && callbacks[uuid](request.data)
  } else {
    const request = msgdata
    const { path, params } = request
    const res = await bridge.trigger(path, params)
    bridge.response(makeResponse({ data: res, request }))
  }
})

class DevBridge extends APIHandler {
  constructor() {
    super({
      send(msgdata) {
        chrome.runtime.postMessage(msgdata)
      },
      callbacks,
      plat: Plat.devtool,
    })
  }
}

export const bridge = new DevBridge()

window.test = async function() {
  const res = await bridge.request(`${Plat.web}/test`, { aaa: 1 })
  console.log(res)
}
