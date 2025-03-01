// 唯一ID生成器
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

/**
 * 基础Bridge类
 */
class BaseBridge {
  constructor(plat) {
    this.plat = plat
    this.handlers = new Map()
    this.pendingRequests = new Map()
    this.timeout = 30000 // 默认30秒超时
  }

  /**
   * 注册路由处理器
   * @param {string} route - 路由路径
   * @param {Function} handler - 处理函数
   */
  on(route, handler) {
    this.handlers.set(route, handler)
  }

  /**
   * 注销路由处理器
   * @param {string} route - 路由路径
   */
  off(route) {
    this.handlers.delete(route)
  }

  /**
   * 处理接收到的请求
   * @param {Object} message - 消息对象
   * @param {Object} sender - 发送者信息
   * @param {Function} sendResponse - 发送响应的函数
   */
  async handleRequest(message, sender, sendResponse) {
    if (message.type !== MessageType.REQUEST) return false

    // 检查是否有对应的路由处理器
    const handler = this.handlers.get(message.route)
    if (!handler) {
      this.sendErrorResponse(message, sender, sendResponse, 'Route not found')
      return false
    }

    try {
      // 执行处理器
      const result = await handler(message.data || {})

      // 发送响应
      const response = {
        type: MessageType.RESPONSE,
        requestId: message.requestId,
        route: message.route,
        data: result,
        target: message.source,
        source: this.plat,
      }

      sendResponse(response)
    } catch (error) {
      this.sendErrorResponse(message, sender, sendResponse, error.message)
    }

    // 返回true表示会异步发送响应
    return true
  }

  /**
   * 发送错误响应
   */
  sendErrorResponse(message, sender, sendResponse, errorMessage) {
    const response = {
      type: MessageType.ERROR,
      requestId: message.requestId,
      route: message.route,
      error: errorMessage,
      target: message.source,
      source: this.plat,
    }

    sendResponse(response)
  }

  /**
   * 处理接收到的响应
   * @param {Object} message - 响应消息
   */
  handleResponse(message) {
    const pendingRequest = this.pendingRequests.get(message.requestId)
    if (!pendingRequest) return

    this.pendingRequests.delete(message.requestId)
    clearTimeout(pendingRequest.timeoutId)

    if (message.type === MessageType.ERROR) {
      pendingRequest.reject(new Error(message.error))
    } else {
      pendingRequest.resolve(message.data)
    }
  }

  /**
   * 创建请求对象
   * @param {string} route - 路由路径
   * @param {Object} data - 请求数据
   * @param {string} target - 目标环境
   */
  createRequest({ path, params }) {
    return {
      type: MsgDef.request,
      source: this.plat,
      target: Object.values(Plat).find(p => path.startsWith(p)),
      requestId: `${path}_${generateId()}`,
      params,
      path,
    }
  }

  /**
   * 发送请求并等待响应
   * @param {string} path - 路由路径
   * @param {Object} data - 请求数据
   * @param {string} target - 目标环境
   */
  request(path, data = {}, target) {
    const requestMessage = this.createRequest({ path, params: data })

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestMessage.requestId)
        reject(new Error(`Request timeout for route: ${path}`))
      }, this.timeout)

      // 存储pending请求
      this.pendingRequests.set(requestMessage.requestId, {
        resolve,
        reject,
        timeoutId,
      })

      // 发送请求 - 由子类实现具体发送逻辑
      this.sendMessage(requestMessage).catch(error => {
        this.pendingRequests.delete(requestMessage.requestId)
        clearTimeout(timeoutId)
        reject(error)
      })
    })
  }

  /**
   * 发送消息 - 由子类实现
   * @param {Object} message - 消息对象
   */
  sendMessage(message) {
    throw new Error('sendMessage method must be implemented by subclass')
  }
}
