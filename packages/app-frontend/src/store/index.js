import Vue from 'vue'
import Vuex from 'vuex'
import vuex from '@front/views/vuex/module'
import router from '@front/views/router/module'
import routes from '@front/views/routes/module'
import perf from '@front/views/perf/module'

Vue.use(Vuex)

export function createStore() {
  const store = new Vuex.Store({
    state: () => ({}),
    mutations: {},
    modules: {
      vuex,
      router,
      routes,
      perf,
    },
  })

  if (module.hot) {
    module.hot.accept(
      [
        '@front/views/vuex/module',
        '@front/views/router/module',
        '@front/views/routes/module',
        '@front/views/perf/module',
      ],
      () => {
        try {
          store.hotUpdate({
            modules: {
              vuex: require('@front/views/vuex/module').default,
              router: require('@front/views/router/module').default,
              routes: require('@front/views/routes/module').default,
              perf: require('@front/views/perf/module').default,
            },
          })
        } catch (e) {
          console.log(e.stack)
        }
      }
    )
  }

  return store
}
