// devtools对象占位
const immScript = document.createElement('script')
immScript.textContent = `window.__VUE_DEVTOOLS_GLOBAL_HOOK__ = {};`
;(document.head || document.documentElement).prepend(immScript)

// 初始化hook
const script = document.createElement('script')
script.src = chrome.runtime.getURL('build/hook-exec.js')
script.onload = () => {
  script.remove()
}
;(document.head || document.documentElement).prepend(script)
