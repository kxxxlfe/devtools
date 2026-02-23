import { target } from '@utils/env'
import engine from './vue2'
import { getRenderKey, flatten, capture, captureChild } from '../../utils'

const functionalVnodeMap = (target.__VUE_DEVTOOLS_FUNCTIONAL_VNODE_MAP__ = new Map())
let functionalIds = new Map()

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

export const functional = {
  capture: captureFunctional,
  captureSubVNodes,
  findInstanceOrVnode,
  functionalIds,
}
