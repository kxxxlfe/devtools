// routes: 注册route触发
exBridge.on(api.routes.init, payload => {
  window.store.commit('routes/INIT', parse(payload))
})

exBridge.on(api.routes.changed, payload => {
  window.store.commit('routes/CHANGED', parse(payload))
})

export const useRoutes = function () {}
