// 初始化hook
const script = document.createElement('script')
script.src = chrome.runtime.getURL('src/hook-exec.js')
script.onload = () => {
  script.remove()
}
;(document.head || document.documentElement).prepend(script)
