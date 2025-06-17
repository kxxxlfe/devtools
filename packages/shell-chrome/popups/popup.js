import { PopupBridge } from '@yuhufe/browser-bridge'
import { api } from '@utils/api'

const bridge = new PopupBridge()

const init = async function () {
  const detectRes = await bridge.request(api.web.fetchVueDetect)

  const descEl = document.body.querySelector('.desc')
  const { vueDetected, nuxtDetected, devtoolsEnabled, vueVersion } = detectRes
  descEl.innerHTML = createDesc(detectRes)
  const showForceEnable = vueDetected && !devtoolsEnabled
}
init()

const createDesc = function ({ vueDetected, nuxtDetected, devtoolsEnabled, vueVersion }) {
  if (!vueDetected) {
    return 'Vue.js not detected'
  }

  if (nuxtDetected) {
    return `Nuxt.js + vue@${vueVersion} is detected on this page`
  } else {
    return `vue@${vueVersion} is detected on this page.`
  }
}
