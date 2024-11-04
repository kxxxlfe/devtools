/* 
  web环境：content <=> web
*/
import { MsgDef, Plat, APIHandler, makeRequest, makeResponse } from './const'

const callbacks = {}

// req/res 处理
window.addEventListener(Plat.web, async function(evt) {
  const { data: msgdata } = evt
  const uuid = msgdata.uuid

  if (msgdata.type === MsgDef.response) {
    callbacks[uuid] && callbacks[uuid](request.data)
  } else {
    const request = msgdata
    const { path, params } = request
    const res = await bridge.trigger(path, params)
    bridge.response(makeResponse({ data: res, request }))
  }
})

class WebBridge extends APIHandler {
  constructor() {
    super({
      send(msgdata) {
        window.postMessage(Plat.content, msgdata)
      },
      callbacks,
      plat: Plat.web,
    })
  }
}

export const bridge = new WebBridge()

bridge.on(`${Plat.web}/test`, function(info) {
  console.log(info)
  return { result: 'ok' }
})
