import { getVerNum } from './common'

// 检验dom元素是否支持vue2
const detectVue = function (dom) {
  if (!dom.__vue_app__) {
    return null
  }

  const appContext = dom.__vue_app__

  return makeEnv(appContext)
}

// 生成标准环境数据
const makeEnv = function (appContext) {
  const { version, _container } = appContext
  // 先判断默认enabled
  const devtoolsEnabled =
    globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__?.enabled ?? !!_container.children?.[0]?.__vueParentComponent
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
