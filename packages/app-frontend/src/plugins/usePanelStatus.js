import { isChrome } from '@utils/env'
import SharedData from '@utils/shared-data'
import { bridge, api } from '../bridge'

let panelShown = true
let pendingAction = null

const updateActive = function () {
  const isActive = () => {
    if (!panelShown) {
      return false
    }

    if (globalThis.document?.visibilityState !== 'visible') {
      return false
    }

    return true
  }

  SharedData.devtoolPageActive = isActive()
}

// Capture and log devtool errors when running as actual extension
// so that we can debug it by inspecting the background page.
// We do want the errors to be thrown in the dev shell though.
if (isChrome) {
  chrome.runtime.onMessage.addListener(request => {
    if (request === 'vue-panel-shown') {
      onPanelShown()
    } else if (request === 'vue-panel-hidden') {
      onPanelHidden()
    }
  })
}

function onPanelShown() {
  panelShown = true
  updateActive()
  if (pendingAction) {
    pendingAction()
    pendingAction = null
  }
}

function onPanelHidden() {
  panelShown = false
  updateActive()
}

// document.visible
globalThis.document?.addEventListener('visibilitychange', function () {
  updateActive()
})
// onHide和onShow不成对，怀疑是长时间锁屏会触发hide
globalThis.document?.addEventListener('pointerdown', function () {
  if (panelShown) {
    return
  }
  panelShown = true
  updateActive()
})

// panel状态
export const useDevPanelStatus = function () {
  return {}
}
