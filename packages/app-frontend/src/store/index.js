import Vue from 'vue'
import Vuex from 'vuex'
import vuex from '@front/views/vuex/module'
import routes from '@front/views/routes/module'

Vue.use(Vuex)

export function createStore() {
  const store = new Vuex.Store({
    state: () => ({}),
    mutations: {},
    modules: {
      vuex,
      routes,
    },
  })

  if (module.hot) {
    module.hot.accept(
      [
        '@front/views/vuex/module',
        '@front/views/routes/module',
      ],
      () => {
        try {
          store.hotUpdate({
            modules: {
              vuex: require('@front/views/vuex/module').default,
              routes: require('@front/views/routes/module').default,
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
