// the background script runs all the time and serves as a central message
// hub for each vue devtools (panel + proxy + backend) instance.
import { BackgroundBridge } from '@yuhufe/browser-bridge'
import { PLATFORM, api } from '@utils/api'

const backBridge = new BackgroundBridge()

const ports = {}

chrome.runtime.onConnect.addListener(port => {
  let tab
  let name
  if (isNumeric(port.name)) {
    tab = port.name
    name = 'devtools'
    installProxy(+port.name)
  } else {
    tab = port.sender.tab.id
    name = 'backend'
  }

  if (!ports[tab]) {
    ports[tab] = {
      devtools: null,
      backend: null,
    }
  }
  ports[tab][name] = port

  if (ports[tab].devtools && ports[tab].backend) {
    doublePipe(tab, ports[tab].devtools, ports[tab].backend)
  }
})

function isNumeric(str) {
  return +str + '' === str
}

function installProxy(tabId) {
  chrome.scripting
    .executeScript({
      target: { tabId: tabId },
      files: ['src/proxy.js'],
    })
    .then(res => {
      if (!res) {
        ports[tabId].devtools.postMessage('proxy-fail')
      } else {
        console.log('injected proxy to tab ' + tabId)
      }
    })
}

function doublePipe(id, one, two) {
  one.onMessage.addListener(lOne)
  function lOne(message) {
    if (message.event === 'log') {
      return console.log('tab ' + id, message.payload)
    }
    console.log('devtools -> backend', message)
    two.postMessage(message)
  }
  two.onMessage.addListener(lTwo)
  function lTwo(message) {
    if (message.event === 'log') {
      return console.log('tab ' + id, message.payload)
    }
    console.log('backend -> devtools', message)
    one.postMessage(message)
  }
  function shutdown() {
    console.log('tab ' + id + ' disconnected.')
    one.onMessage.removeListener(lOne)
    two.onMessage.removeListener(lTwo)
    one.disconnect()
    two.disconnect()
    ports[id] = null
    updateContextMenuItem()
  }
  one.onDisconnect.addListener(shutdown)
  two.onDisconnect.addListener(shutdown)
  console.log('tab ' + id + ' connected.')
  updateContextMenuItem()
}

backBridge.on(api.back.vueDetectResult, function ({ vueDetected, nuxtDetected, sender }) {
  if (!vueDetected) {
    return
  }

  const suffix = nuxtDetected ? '.nuxt' : ''
  chrome.action.setIcon({
    tabId: sender.tab.id,
    path: {
      16: `../icons/16${suffix}.png`,
      48: `../icons/48${suffix}.png`,
      128: `../icons/128${suffix}.png`,
    },
  })
})

// Right-click inspect context menu entry
let activeTabId
chrome.tabs.onActivated.addListener(({ tabId }) => {
  activeTabId = tabId
  updateContextMenuItem()
})

let updateContextMenuItem = () => {}

// 兼容electron
if (chrome.contextMenus) {
  updateContextMenuItem = function () {
    chrome.contextMenus.removeAll(() => {
      if (ports[activeTabId]) {
        chrome.contextMenus.create({
          id: 'vue-inspect-instance',
          title: 'Inspect Vue component',
          contexts: ['all'],
        })
      }
    })
  }

  chrome.contextMenus?.onClicked.addListener((info, tab) => {
    chrome.runtime.sendMessage({
      vueContextMenu: {
        id: info.menuItemId,
      },
    })
  })
}

// 监听页面开始加载
if (chrome.webNavigation) {
  chrome.webNavigation.onCommitted.addListener(details => {
    // 只在主框架 (frameId === 0) 注入
    if (details.frameId !== 0) {
      return
    }

    // 过滤掉 Chrome 内置页面、DevTools、chrome:// 或者 extension://
    if (!details.url?.startsWith('http')) {
      return
    }

    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      world: 'MAIN', // 在页面主世界运行，能直接改 window
      injectImmediately: true, // 等价于 document_start
      func: () => {
        // 抢在vue前注入
        globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__ = globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__ || { emit() {}, on() {} }
      },
    })
  })
}
