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
    const { data: winMsg } = evt
    if (!winMsg.msgid || !winMsg.msg) {
      return
    }
    // 只处理外部过来的请求数据
    if (winMsg.sender === this.plat) {
      return
    }
    if (winMsg.type !== MsgDef.response) {
      return
    }
    this.callbacks[winMsg.msgid]?.(winMsg.msg)
  }
  post(msg) {
    const winMsg = { msg, sender: this.plat, type: MsgDef.request, msgid: `winpost_${this.plat}_${Date.now()}` }
    const callbacks = this.callbacks
    return new Promise(resolve => {
      callbacks[winMsg.msgid] = function (response) {
        resolve(response)
        delete callbacks[winMsg.msgid]
      }
      window.postMessage(winMsg)
    })
  }
  response({ request, response }) {
    window.postMessage({ msg: response, sender: this.plat, type: MsgDef.response, msgid: request.msgid })
  }
  parseMsg(winMsg) {
    if (!winMsg?.msgid || !winMsg?.msg) {
      return
    }
    // 只处理外部过来的请求数据
    if (winMsg.sender === this.plat) {
      return
    }
    if (winMsg.type !== MsgDef.request) {
      return
    }

    return winMsg.msg
  }
}
