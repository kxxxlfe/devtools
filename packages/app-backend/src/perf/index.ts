import { getHook } from '../utils'
import { initPerfVue3Backend } from './perf-vue3'
import { initPerfVue2Backend } from './perf-vue2'

export const initPerfBackend = function () {
  const Vue = getHook()?.Vue
  return Vue ? initPerfVue2Backend(Vue) : initPerfVue3Backend()
}
