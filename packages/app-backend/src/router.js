import { stringify } from '@utils/util'
import { bridge as exBridge, api } from './bridge'
import sharedData from '@utils/shared-data'

export function initRouterBackend(Vue, bridge, rootInstances) {
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
            to,
            from,
            timestamp: Date.now(),
          })
        )
      })
      exBridge.send(
        api.router.init,
        stringify({
          mode: router.mode,
          current: {
            from: router.history.current,
            to: router.history.current,
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

export function getCustomRouterDetails(router) {
  return {
    _custom: {
      type: 'router',
      display: 'VueRouter',
      value: {
        options: router.options,
        currentRoute: router.currentRoute,
      },
      fields: {
        abstract: true,
      },
    },
  }
}
