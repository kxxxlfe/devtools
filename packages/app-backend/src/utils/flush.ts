/**
 * Flush/capture 相关状态与逻辑：instanceMap、functionalVnodeMap、根 UID、
 * 组件树 capture，由 index 通过 import 使用。flush 方法在 index 中调用。
 */
import { target } from '@utils/env'
import { classify } from '@utils/util'
import { engine } from '../engine'
import { filter } from './global'

// --- 在 flush 中定义，供 index 及其他模块 import ---
export const instanceMap = (target.__VUE_DEVTOOLS_INSTANCE_MAP__ = new Map())
export const functionalVnodeMap = (target.__VUE_DEVTOOLS_FUNCTIONAL_VNODE_MAP__ = new Map())
export const consoleBoundInstances = Array(5)

let rootUID = 0
export function getNextRootUID() {
  return ++rootUID
}

// --- 仅本模块使用的过程变量 ---
export let captureCount = 0 // 本次 flush 中已 capture 的实例数量（用于 dev 日志）
const functionalIds = new Map()
const captureIds = new Map()

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

function getUniqueId(instance) {
  const rootVueId = engine.root(instance).__VUE_DEVTOOLS_ROOT_UID__
  return `${rootVueId}:${engine.uid(instance)}`
}

function mark(instance) {
  if (!instanceMap.has(instance.__VUE_DEVTOOLS_UID__)) {
    instanceMap.set(instance.__VUE_DEVTOOLS_UID__, instance)
    instance.$on('hook:beforeDestroy', function () {
      instanceMap.delete(instance.__VUE_DEVTOOLS_UID__)
    })
  }
}

function markFunctional(id, vnode) {
  const refId = vnode.fnContext.__VUE_DEVTOOLS_UID__
  if (!functionalVnodeMap.has(refId)) {
    functionalVnodeMap.set(refId, {})
    vnode.fnContext.$on('hook:beforeDestroy', function () {
      functionalVnodeMap.delete(refId)
    })
  }
  functionalVnodeMap.get(refId)[id] = vnode
}

function isQualified(instance) {
  const name = classify(instance.name || engine.getInstanceName(instance)).toLowerCase()
  return name.includes(filter)
}

function captureChild(child) {
  if (child.fnContext && !child.componentInstance) {
    return capture(child)
  } else if (child.componentInstance) {
    if (!child.componentInstance._isBeingDestroyed) return capture(child.componentInstance)
  } else if (child.children) {
    return flatten(child.children.map(c => captureChild(c)))
  }
}

function capture(instance) {
  if (process.env.NODE_ENV !== 'production') {
    captureCount++
  }

  if (instance.$options?.abstract && instance._vnode?.componentInstance) {
    instance = instance._vnode.componentInstance
  }

  if (instance.fnContext && !instance.componentInstance) {
    const contextUid = instance.fnContext.__VUE_DEVTOOLS_UID__
    let id = functionalIds.get(contextUid)
    if (id == null) {
      id = 0
    } else {
      id++
    }
    functionalIds.set(contextUid, id)
    const functionalId = contextUid + ':functional:' + id
    markFunctional(functionalId, instance)
    return {
      id: functionalId,
      functional: true,
      name: engine.getInstanceName(instance),
      renderKey: getRenderKey(instance.key),
      children: (instance.children
        ? instance.children.map(child =>
            child.fnContext
              ? captureChild(child)
              : child.componentInstance
              ? capture(child.componentInstance)
              : undefined
          )
        : instance.componentInstance
        ? [capture(instance.componentInstance)]
        : []
      ).filter(Boolean),
      inactive: false,
      isFragment: false,
    }
  }

  instance.__VUE_DEVTOOLS_UID__ = getUniqueId(instance)
  if (captureIds.has(instance.__VUE_DEVTOOLS_UID__)) {
    return
  }
  captureIds.set(instance.__VUE_DEVTOOLS_UID__, undefined)
  mark(instance)
  const name = engine.getInstanceName(instance)

  const ret: any = {
    uid: engine.uid(instance),
    id: instance.__VUE_DEVTOOLS_UID__,
    name,
    renderKey: getRenderKey(instance.$vnode ? instance.$vnode['key'] : null),
    inactive: !!instance._inactive,
    isFragment: !!instance._isFragment,
    children: instance.$children
      .filter(child => !child._isBeingDestroyed)
      .map(c => capture(c))
      .filter(Boolean),
  }

  if (instance._vnode?.children) {
    ret.children = [...ret.children, ...flatten(instance._vnode.children.map(c => captureChild(c))).filter(Boolean)]
  }

  if (!instance._inactive) {
    const rect = engine.getInstanceOrVnodeRect(instance)
    ret.top = rect ? rect.top : Infinity
  } else {
    ret.top = Infinity
  }
  const consoleId = consoleBoundInstances.indexOf(instance.__VUE_DEVTOOLS_UID__)
  ret.consoleId = consoleId > -1 ? '$vm' + consoleId : null
  const isRouterView2 = instance.$vnode?.data.routerView
  if (instance._routerView || isRouterView2) {
    ret.isRouterView = true
    if (!instance._inactive && instance.$route) {
      const matched = instance.$route.matched
      const depth = isRouterView2 ? instance.$vnode.data.routerViewDepth : instance._routerView.depth
      ret.matchedRouteSegment = matched?.[depth] && (isRouterView2 ? matched[depth].path : matched[depth].handler.path)
    }
  }
  return ret
}

function findQualifiedChildren(instance) {
  if (isQualified(instance)) {
    return capture(instance)
  }
  const children = engine.children(instance)
  let functionalChildren = []
  if (instance._vnode?.children) {
    const funcNodes = instance._vnode.children.filter(child => !child.componentInstance).map(c => capture(c))
    functionalChildren = flatten(funcNodes).filter(inst => isQualified(inst))
  }
  return [...findQualifiedChildrenFromList(children), ...functionalChildren]
}

export function findQualifiedChildrenFromList(instances) {
  instances = instances.filter(child => !engine.isDestroyed(child))
  return !filter ? instances.map(inst => capture(inst)) : flatten(instances.map(inst => findQualifiedChildren(inst)))
}

/** 在 index 的 flush 调用前清空本次 capture 的状态 */
export function clearFlushState() {
  functionalIds.clear()
  captureIds.clear()
  captureCount = 0
}
