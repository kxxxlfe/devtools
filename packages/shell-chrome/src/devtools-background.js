// This is the devtools script, which is called when the user opens the
// Chrome devtool on a page. We check to see if we global hook has detected
// Vue presence on the page. If yes, create the Vue panel; otherwise poll
// for 10 seconds.

let created = false
let checkCount = 0

chrome.devtools.network.onNavigated.addListener(createPanelIfHasVue)
const checkVueInterval = setInterval(createPanelIfHasVue, 1000)
createPanelIfHasVue()

function createPanelIfHasVue() {
  if (created || checkCount++ > 20) {
    clearInterval(checkVueInterval)
    return
  }
  chrome.devtools.inspectedWindow.eval('!!(window.__VUE_DEVTOOLS_GLOBAL_HOOK__.env)', function (hasVue) {
    if (!hasVue || created) {
      return
    }
    clearInterval(checkVueInterval)
    created = true
    chrome.devtools.panels.create('Vue', 'icons/128.png', 'devtools.html', panel => {
      // panel loaded
      panel.onShown.addListener(onPanelShown)
      panel.onHidden.addListener(onPanelHidden)
    })
  })
}

// Runtime messages

// Page context menu entry
// Execute pending action when Vue panel is ready

// Manage panel visibility

function onPanelShown() {
  chrome.runtime.sendMessage('vue-panel-shown')
}

function onPanelHidden() {
  chrome.runtime.sendMessage('vue-panel-hidden')
}
