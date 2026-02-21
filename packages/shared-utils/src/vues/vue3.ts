import { getVerNum } from './common'

// 检验dom元素是否支持vue2
const detectVue = function (dom) {
  if (!dom.__vue_app__) {
    return null
  }

  const appContext = dom.__vue_app__
  const devtoolsEnabled = dom.children?.[0]?.__vueParentComponent

  return {
    version: appContext.version,
    verNum: getVerNum(appContext.version),
    devtoolsEnabled,
    // vue3数据
    appContext,
  }
}

// 生成标准环境数据
const makeEnv = function (appContext) {
  const { version, _container } = appContext
  const devtoolsEnabled = _container.children?.[0]?.__vueParentComponent
  return {
    version,
    verNum: getVerNum(version),
    devtoolsEnabled,
    // vue2数据
    appContext,
  }
}

export default {
  detectVue,
  makeEnv,
}
