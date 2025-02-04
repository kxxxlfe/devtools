import Vue from 'vue'
import Vuex from 'vuex'
import vuex from '@front/views/vuex/module'
import events from '@front/views/events/module'
import router from '@front/views/router/module'
import routes from '@front/views/routes/module'
import perf from '@front/views/perf/module'

Vue.use(Vuex)

export function createStore() {
  const store = new Vuex.Store({
    state: () => ({
      message: '',
      view: 'vertical',
    }),
    mutations: {
      SHOW_MESSAGE(state, message) {
        state.message = message
      },
      SWITCH_VIEW(state, view) {
        state.view = view
      },
    },
    modules: {
      vuex,
      events,
      router,
      routes,
      perf,
    },
  })

  if (module.hot) {
    module.hot.accept(
      [
        '@front/views/vuex/module',
        '@front/views/events/module',
        '@front/views/router/module',
        '@front/views/routes/module',
        '@front/views/perf/module',
      ],
      () => {
        try {
          store.hotUpdate({
            modules: {
              vuex: require('@front/views/vuex/module').default,
              events: require('@front/views/events/module').default,
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
