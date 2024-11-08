export const MsgDef = {
  request: 'request',
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
export const makeRequest = function ({ plat, path, params }) {
  return {
    type: MsgDef.request,
    source: plat,
    target: Object.values(Plat).find(p => path.startsWith(p)),
    uuid: `${plat}_${Date.now()}`,
    params,
    path,
  }
}
export const makeResponse = function ({ plat, data, error, request }) {
  const { uuid, path, source } = request
  return {
    type: MsgDef.response,
    reqPath: path,
    source: plat,
    target: source,
    uuid,
    data: {
      ret: error ? 0 : -1,
      errmsg: error || undefined,
      data,
    },
  }
}
export const isBridgeMessage = function (msgdata) {
  return msgdata?.uuid && [MsgDef.request, MsgDef.response].includes(msgdata.type)
}

// 支持promise的window.postMessage；监听了message，单例使用
export class WinPost {
  plat = ''
  callbacks = {}
  constructor({ plat }) {
    this.plat = plat
    this.onResponseMessage = this.onResponseMessage.bind(this)
    window.addEventListener('message', this.onResponseMessage)
  }
  onResponseMessage(evt) {
    const { data: msgdata } = evt
    if (!isBridgeMessage(msgdata)) {
      return
    }
    // 只处理外部过来的请求数据
    if (msgdata.sender === this.plat) {
      return
    }
    if (msgdata.type === MsgDef.response) {
      this.callbacks[msgdata.uuid]?.(msgdata.data)
    }
  }
  post(msg) {
    msg.sender = this.plat
    const callbacks = this.callbacks
    return new Promise(resolve => {
      callbacks[msg.uuid] = function (response) {
        resolve(response)
        delete callbacks[msg.uuid]
      }
      window.postMessage(msg)
    })
  }
}
