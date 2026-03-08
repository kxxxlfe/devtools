import { target } from '@utils/env'
import { classify, basename } from '@utils/util'
import engine from './vue2'
import { getInstanceOrVnodeRect } from './rect'
import {
  getRenderKey,
  flatten,
  instanceMap,
  getUniqueId,
  captureIds,
  consoleBoundInstances,
  processProps,
} from '../../utils'

const functionalVnodeMap = (target.__VUE_DEVTOOLS_FUNCTIONAL_VNODE_MAP__ = new Map())
let functionalIds = new Map()

function mark(instance) {
  if (!instanceMap.has(instance.__VUE_DEVTOOLS_UID__)) {
    instanceMap.set(instance.__VUE_DEVTOOLS_UID__, instance)
    instance.$on('hook:beforeDestroy', function () {
      instanceMap.delete(instance.__VUE_DEVTOOLS_UID__)
    })
  }
}

export function captureChild(child) {
  if (child.fnContext && !child.componentInstance) {
    return capture(child)
  } else if (child.componentInstance) {
    if (!child.componentInstance._isBeingDestroyed) return capture(child.componentInstance)
  } else if (child.children) {
    return flatten(child.children.map(c => captureChild(c)))
  }
}

export function capture(instance) {
  if (instance.$options?.abstract && instance._vnode?.componentInstance) {
    instance = instance._vnode.componentInstance
  }

  const functionalInst = captureFunctional(instance)
  if (functionalInst) {
    return functionalInst
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

  if (!ret.inactive) {
    const rect = getInstanceOrVnodeRect(instance)
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

function captureFunctional(instance) {
  // Functional component.
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
        : // router-view has both fnContext and componentInstance on vnode.
        instance.componentInstance
        ? [capture(instance.componentInstance)]
        : []
      ).filter(Boolean),
      inactive: false,
      isFragment: false, // TODO: Check what is it for.
    }
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

// Find functional components in recursively in non-functional vnodes.
export const captureSubVNodes = function (instance) {
  const funcVNodes = instance._vnode?.children
  if (funcVNodes) {
    const funcInsts = funcVNodes.filter(child => !child.componentInstance).map(capture)
    return flatten(funcInsts)
  }

  return []
}

export function findInstanceOrVnode(id) {
  if (/:functional:/.test(id)) {
    const [refId] = id.split(':functional:')
    return functionalVnodeMap.get(refId)?.[id]
  }
}

export function getOptionName(options) {
  const name = options.name || options._componentTag
  if (name) {
    return name
  }
  const file = options.__file // injected by vue-loader
  if (file) {
    return classify(basename(file, '.vue'))
  }
}

const getFunctionalTreeData = function (id) {
  const vnode = findInstanceOrVnode(id)

  if (!vnode) return {}

  const data = {
    id,
    name: getOptionName(vnode.fnOptions),
    file: vnode.fnOptions.__file || null,
    state: processProps({
      $options: vnode.fnOptions,
      ...(vnode.devtoolsMeta?.renderContext.props || {}),
    }),
    functional: true,
  }

  return data
}

export const functional = {
  captureSubVNodes,
  findInstanceOrVnode,
  functionalIds,
  getTreeData: getFunctionalTreeData,
}
