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

const callbacks = {}

// 公共的 请求/返回 逻辑
export class APIHandler {
  handlers = {}
  callbacks = {}
  plat = ''
  send = (...args) => {}
  constructor({ callbacks, send, plat }) {
    this.callbacks = callbacks
    this.send = send
    this.plat = plat
  }
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
  request(path, params) {
    const msg = makeRequest({ plat: this.plat, path, params })

    return new Promise(resolve => {
      callbacks[msg.uuid] = function(response) {
        resolve(response)
        delete callbacks[msg.uuid]
      }
      this.send(msg)
    })
  }
  response(res) {
    this.send(res)
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
  return msgdata.uuid && [MsgDef.request, MsgDef.response].includes(msgdata.type)
}

// 消息处理
