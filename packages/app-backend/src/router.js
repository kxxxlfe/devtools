import { stringify } from '@utils/util'
import { bridge as exBridge, api } from './bridge'
import sharedData from '@utils/shared-data'

export function initRouterBackend(rootInstances) {
  const getSnapshot = () => {
    const routeChanges = []
    rootInstances.forEach(instance => {
      const router = instance._router
      if (router?.options?.routes) {
        routeChanges.push(...router.options.routes)
      }
    })
    return stringify({
      routeChanges,
    })
  }

  exBridge.send(api.routes.init, getSnapshot())

  rootInstances.forEach(instance => {
    const router = instance._router

    if (router) {
      router.afterEach((to, from) => {
        if (!sharedData.recordRouter) return
        exBridge.send(
          api.router.changed,
          stringify({
            to: clipRoute(to),
            from: clipRoute(from),
            timestamp: Date.now(),
          })
        )
      })
      exBridge.send(
        api.router.init,
        stringify({
          mode: router.mode,
          current: {
            from: clipRoute(router.history.current),
            to: clipRoute(router.history.current),
            timestamp: Date.now(),
          },
        })
      )

      if (router.matcher?.addRoutes) {
        const addRoutes = router.matcher.addRoutes
        router.matcher.addRoutes = function (routes) {
          routes.forEach(item => {
            exBridge.send(api.routes.changed, stringify(item))
          })
          addRoutes.call(this, routes)
        }
      }
    }
  })
}

// 序列化route需要剪枝
const clipRoute = function (route) {
  if (!route) {
    return route
  }
  return {
    ...route,
    matched: route.matched?.map(m => {
      return {
        ...m,
        components: undefined,
        instances: undefined,
        parent: clipRoute(m.parent),
      }
    }),
  }
}
