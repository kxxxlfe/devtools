import { getVerNum } from './common'

// 检验dom元素是否支持vue2
const detectVue = function (dom) {
  if (!dom.__vue__) {
    return null
  }

  const component = dom.__vue__
  let Vue = Object.getPrototypeOf(component).constructor
  while (Vue.super) {
    Vue = Vue.super
  }

  return {
    version: Vue.version,
    verNum: getVerNum(Vue.version),
    devtoolsEnable: Vue.config.devtools,
    env: { Vue, store: component.$store },
  }
}

export default {
  detectVue,
}
