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
    ...makeEnv(Vue),
    // vue2数据
    store: component.$store,
  }
}

// 生成标准环境数据
const makeEnv = function (Vue) {
  const { version } = Vue
  return {
    version,
    verNum: getVerNum(version),
    devtoolsEnabled: Vue.config.devtools,
    // vue2数据
    Vue,
  }
}

export default {
  detectVue,
  makeEnv,
}
