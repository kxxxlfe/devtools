import { envs } from './vues'

export function waitTime(time = 100) {
  return new Promise(r => setTimeout(r, time))
}
export function waitUntil({ trigger, timeout = 0, maxTimes = 100 }) {
  let tryCount = 0
  const stopped = 'stopped'
  return new Promise(async (resolve, reject) => {
    while (tryCount < maxTimes) {
      const result = trigger(stopped)
      if (result === stopped) {
        return reject('waitUntil 终止')
      }
      if (result) {
        return resolve(result)
      }
      tryCount++
      await waitTime(timeout)
    }

    reject('waitUntil 超过最大次数')
  })
}

export const treeUtil = {
  // 遍历
  // 特性1：返回false代表截断，不再向下遍历
  tranverse(root, callback) {
    if (!root) {
      return
    }

    const stack = []
    if (Reflect.has(root, 'length')) {
      stack.push(...root)
    } else {
      stack.push(root)
    }

    while (stack.length) {
      const currNode = stack.shift()
      const breakFlag = callback(currNode)
      if (breakFlag === false) {
        break
      }

      Array.prototype.forEach.call(currNode.children || [], node => {
        if (node) {
          stack.push(node)
        }
      })
    }

    return
  },
}

// 嗅探Vue
export const detectVue = async function ({ times = 1000 } = {}) {
  const innerDetect = function () {
    if (!globalThis.document?.body) {
      return null
    }

    let runCount = 0
    let envData = null
    treeUtil.tranverse(globalThis.document.body, function (node) {
      runCount++
      // 最多查找1000个节点
      if (runCount >= times) {
        return false
      }
      // 已找到
      if (envData) {
        return false
      }

      const vue2Env = envs.vue2.detectVue(node)
      if (vue2Env) {
        envData = vue2Env
        return
      }
      const vue3Env = envs.vue3.detectVue(node)
      if (vue3Env) {
        envData = vue3Env
        return
      }
    })

    return envData
  }

  let res
  try {
    // 找3次
    res = await waitUntil({ trigger: innerDetect, timeout: 500, maxTimes: 3 })
    return res
  } catch (e) {
    return null
  }
}

// `checkVisibility` polyfill, not consider parent visibility
export function checkVisibility(el) {
  if (!el) {
    return false
  }
  if (el.checkVisibility) {
    return el.checkVisibility()
  }

  const rect = el.getBoundingClientRect()
  return rect.width === 0 && rect.height === 0
}
