import { getVerNum } from './common'

// 检验dom元素是否支持vue2
const detectVue = function (dom) {
  if (!dom.__vue_app__) {
    return null
  }

  const appContext = dom.__vue_app__
  const devtoolsEnable = dom.children?.[0]?.__vueParentComponent

  return {
    version: appContext.version,
    verNum: getVerNum(appContext.version),
    devtoolsEnable,
    env: { appContext },
  }
}

export default {
  detectVue,
}
