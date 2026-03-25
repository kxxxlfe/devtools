/**
 * 组件树 capture，由 index 通过 import 使用。flush 方法在 index 中调用。
 */
import { target } from '@utils/env'
import { classify, setInstanceMap } from '@utils/util'
import { engine } from '../engine'
import { filter } from './global'

// --- 在 flush 中定义，供 index 及其他模块 import ---
export const instanceMap = (target.__VUE_DEVTOOLS_INSTANCE_MAP__ = new Map())
export const consoleBoundInstances = Array(5)

setInstanceMap(instanceMap)

let rootUID = 0
export function getNextRootUID() {
  return ++rootUID
}

// --- 仅本模块使用的过程变量 ---
export let captureCount = 0 // 本次 flush 中已 capture 的实例数量（用于 dev 日志）
export const captureIds = new Map()

// --- 工具函数（保留原有实现）---
export function getRenderKey(value) {
  if (value == null) return
  const type = typeof value
  if (type === 'number') {
    return value
  } else if (type === 'string') {
    return `'${value}'`
  } else if (Array.isArray(value)) {
    return 'Array'
  } else {
    return 'Object'
  }
}

export function flatten(items) {
  return items.reduce((acc, item) => {
    if (item instanceof Array) acc.push(...flatten(item))
    else if (item) acc.push(item)
    return acc
  }, [])
}

export function getUniqueId(instance) {
  const rootVueId = engine.root(instance).__VUE_DEVTOOLS_ROOT_UID__
  return `${rootVueId}:${engine.uid(instance)}`
}

function isQualified(instance) {
  const name = classify(instance.name || engine.getInstanceName(instance)).toLowerCase()
  return name.includes(filter)
}

export function capture(instance) {
  if (process.env.NODE_ENV !== 'production') {
    captureCount++
  }

  return engine.capture(instance)
}

// 遍历组件树，支持中断
const BreakSymbol = Symbol('break')
const traverseInstance = function (instance, callback) {
  const res = callback(instance)
  if (res === BreakSymbol) {
    return
  }

  const children = engine.children(instance) || []
  children.forEach(child => traverseInstance(child, callback))

  const fchildren = engine.functional?.children(instance) || []
  fchildren.forEach(child => traverseInstance(child, callback))
}

export function findQualifiedChildrenFromList(instances) {
  instances = instances.filter(child => !engine.isDestroyed(child))
  if (!filter) {
    return instances.map(capture)
  }

  // 寻找符合条件的所有节点
  const filteredChildren = []
  instances.forEach(instance => {
    traverseInstance(instance, function (curr) {
      // 符合条件直接中断
      if (isQualified(curr)) {
        const node = capture(curr)
        filteredChildren.push(node)
        return BreakSymbol
      }
    })
  })

  return filteredChildren
}

/** 在 index 的 flush 调用前清空本次 capture 的状态 */
export function clearFlushState() {
  engine.functional?.functionalIds.clear()
  captureIds.clear()
  captureCount = 0
}
