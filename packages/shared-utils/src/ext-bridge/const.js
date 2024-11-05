export const MsgDef = {
  request: 'requiest',
  response: 'response',
}

export const Plat = {
  web: 'kxext/web',
  content: 'kxext/content',
  popup: 'kxext/popup',
  devtool: 'kxext/devtool', // devtool主页面
  background: 'kxext/background',
}

// 事件总线
export class EventHandle {
  handlers = {}
  on(path, handler) {
    this.handlers[path] = handler
  }
  async trigger(path, params) {
    const handler = this.handlers[path] // 1个接口只有1个处理
    if (!handler) {
      return
    }

    const res = await handler(params)

    return res
  }
}

// 工具方法
export const makeRequest = function({ plat, path, params }) {
  return {
    type: MsgDef.request,
    source: plat,
    uuid: `${plat}_${Date.now()}`,
    params,
    path,
  }
}
export const makeResponse = function({ plat, data, error, request }) {
  const { uuid, path } = request
  return {
    type: MsgDef.response,
    reqPath: path,
    source: plat,
    uuid,
    ret: error ? 0 : -1,
    errmsg: error || undefined,
    data,
  }
}
export const isBridgeMessage = function(msgdata) {
  return msgdata?.uuid && [MsgDef.request, MsgDef.response].includes(msgdata.type)
}

// 支持promise的window.postMessage
let inited = false
const callbacks = {}
async function onResponseMessage(evt) {
  const { data: msgdata } = evt
  if (!msgdata.targetPlat?.startsWith(this.plat)) {
    return
  }
  const uuid = msgdata.uuid

  if (msgdata.type === MsgDef.response) {
    callbacks[uuid] && callbacks[uuid](msgdata.data)
  }
}
export const makeWinPost = function(msg) {
  if (!inited) {
    window.removeEventListener('message', onResponseMessage)
    window.addEventListener('message', onResponseMessage)
  }
  return new Promise(resolve => {
    callbacks[msg.uuid] = function(response) {
      resolve(response)
      delete callbacks[msg.uuid]
    }
    window.postMessage(msg)
  })
}
