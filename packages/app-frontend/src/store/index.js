import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export function createStore() {
  const store = new Vuex.Store({
    state: () => ({}),
    mutations: {},
  })

  return store
}
