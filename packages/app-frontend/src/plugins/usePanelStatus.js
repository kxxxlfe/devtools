import { isChrome } from '@utils/env'

let panelShown = !isChrome
let pendingAction = null
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

function ensurePaneShown(cb) {
  if (panelShown) {
    cb()
  } else {
    pendingAction = cb
  }
}

function onPanelShown() {
  panelShown = true
  if (pendingAction) {
    pendingAction()
    pendingAction = null
  }
}

function onPanelHidden() {
  panelShown = false
}

// panel状态
export const useDevPanelStatus = function () {
  return { ensurePaneShown }
}
