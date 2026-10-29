import { target } from '@utils/env'
import { getInstanceOrVnodeRect } from './rect'
import { getRenderKey, instanceMap, getUniqueId, captureIds, consoleBoundInstances } from '../../utils'
import engine from './vue3'

export function capture(instance: any) {
  if (!instance?.subTree) return

  const routerViewInfo = instance.__vrv_devtools
  // Preserve the flattened RouterView -> page presentation, but metadata alone
  // does not identify a RouterView wrapper (e.g. with Nuxt / custom slots).
  if (routerViewInfo && instance.subTree.component) {
    instance = instance.subTree.component
  }

  const duid = getUniqueId(instance)
  instance.__VUE_DEVTOOLS_UID__ = duid
  if (captureIds.has(duid)) {
    return
  }
  captureIds.set(duid, undefined)
  if (!instanceMap.has(duid)) {
    instanceMap.set(duid, instance)
  }
  const name = engine.getInstanceName(instance)

  const children = (engine.children(instance) || [])
    .filter(child => !engine.isDestroyed(child))
    .map(c => capture(c))
    .filter(Boolean)

  const ret: any = {
    uid: engine.uid(instance),
    id: duid,
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

  if (routerViewInfo) {
    ret.isRouterView = true
    ret.matchedRouteSegment = routerViewInfo.path
  }

  return ret
}

const hook = target.__VUE_DEVTOOLS_GLOBAL_HOOK__
hook?.on('component:removed', function (app, uid, puid, instance) {
  instanceMap.delete(instance.__VUE_DEVTOOLS_UID__)
})
hook?.on('component:added', function (app, uid, puid, instance) {
  // console.log(instance)
})
