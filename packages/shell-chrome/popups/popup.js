import { PopupBridge } from '@yuhufe/browser-bridge'
import { api } from '@utils/api'

const bridge = new PopupBridge()

// desc
const descEl = document.body.querySelector('.desc')
const enableDescEl = document.body.querySelector('.enable-desc')
const initDesc = async function ({ vueDetected, nuxtDetected, devtoolsEnabled, vueVersion }) {
  const createDesc = function () {
    if (!vueDetected) {
      return 'Vue.js not detected'
    }

    if (nuxtDetected) {
      return `Nuxt.js + vue@${vueVersion} is detected on this page`
    } else {
      return `vue@${vueVersion} is detected on this page.`
    }
  }

  descEl.innerHTML = createDesc()
  enableDescEl.innerHTML = devtoolsEnabled
    ? 'Open DevTools and look for the Vue panel.'
    : "Devtools inspection is not available because it's in production mode or explicitly disabled by the author."
}

// force enable
const enableWrapper = document.body.querySelector('.enable-wrapper')
const enableEl = enableWrapper.querySelector('#forceEnabled')

enableEl.addEventListener('change', () => {
  bridge.send(api.web.changeDevtoolsEnable, enableEl.checked)
})
const initEnable = function ({ vueDetected, nuxtDetected, devtoolsEnabled, devtoolsForceEnabled }) {
  const showForceEnable = vueDetected && !devtoolsEnabled
  enableWrapper.style.display = showForceEnable ? 'inline-flex' : 'none'
  enableEl.checked = !!devtoolsForceEnabled
}

// init
const init = async function () {
  const detectRes = await bridge.request(api.web.fetchVueDetect)
  initDesc(detectRes)
  initEnable(detectRes)
}
init()
