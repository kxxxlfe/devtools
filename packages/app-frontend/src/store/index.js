import Vue from 'vue'
import Vuex from 'vuex'
import vuex from '@front/views/vuex/module'

Vue.use(Vuex)

export function createStore() {
  const store = new Vuex.Store({
    state: () => ({}),
    mutations: {},
    modules: {
      vuex,
    },
  })

  if (module.hot) {
    module.hot.accept(
      [
        '@front/views/vuex/module',
      ],
      () => {
        try {
          store.hotUpdate({
            modules: {
              vuex: require('@front/views/vuex/module').default,
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
