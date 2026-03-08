import { envs } from './vues'

export function waitTime(time = 100) {
  return new Promise(r => setTimeout(r, time))
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
export const detectVue = function ({ times = 1000 } = {}) {
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
