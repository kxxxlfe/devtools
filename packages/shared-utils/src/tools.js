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
export const detectVue = function () {
  if (!globalThis.document?.body) {
    return null
  }

  let runCount = 0
  let $el = null
  treeUtil.tranverse(globalThis.document.body, function (node) {
    runCount++
    if (node.__vue__) {
      $el = node
      return false
    }
    // 最多查找1000个节点
    if (runCount >= 1000) {
      return false
    }
  })

  if (!$el) {
    return null
  }

  let Vue = Object.getPrototypeOf(el.__vue__).constructor
  while (Vue.super) {
    Vue = Vue.super
  }

  return Vue
}
