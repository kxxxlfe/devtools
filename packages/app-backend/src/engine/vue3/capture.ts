import { getInstanceOrVnodeRect } from './rect'
import { getRenderKey, instanceMap, getUniqueId, captureIds, consoleBoundInstances } from '../../utils'
import engine from './vue3'

function mark(instance: any) {
  if (!instanceMap.has(instance.__VUE_DEVTOOLS_UID__)) {
    instanceMap.set(instance.__VUE_DEVTOOLS_UID__, instance)
    // Vue 3 has no $on('hook:beforeDestroy'); cleanup relies on flush / other mechanisms
  }
}

export function capture(instance: any) {
  if (!instance?.subTree) return

  instance.__VUE_DEVTOOLS_UID__ = getUniqueId(instance)
  if (captureIds.has(instance.__VUE_DEVTOOLS_UID__)) {
    return
  }
  captureIds.set(instance.__VUE_DEVTOOLS_UID__, undefined)
  mark(instance)
  const name = engine.getInstanceName(instance)

  const children = (engine.children(instance) || [])
    .filter((child: any) => !engine.isDestroyed(child))
    .map((c: any) => capture(c))
    .filter(Boolean)

  const ret: any = {
    uid: engine.uid(instance),
    id: instance.__VUE_DEVTOOLS_UID__,
    name,
    renderKey: getRenderKey(instance.subTree?.key ?? null),
    inactive: !engine.isActive(instance),
    isFragment: !!engine.isFragment(instance),
    children,
  }

  if (!ret.inactive) {
    const rect = getInstanceOrVnodeRect(instance)
    ret.top = rect?.top ?? Infinity
  } else {
    ret.top = Infinity
  }

  const consoleId = consoleBoundInstances.indexOf(instance.__VUE_DEVTOOLS_UID__)
  ret.consoleId = consoleId > -1 ? '$vm' + consoleId : null

  const proxy = instance.proxy
  const route = proxy?.$route
  if (route) {
    ret.isRouterView = true
    const matched = route.matched
    const depth = (proxy as any).__routerViewDepth ?? 0
    const segment = matched?.[depth]
    ret.matchedRouteSegment = segment?.path ?? (segment as any)?.handler?.path
  }

  return ret
}
