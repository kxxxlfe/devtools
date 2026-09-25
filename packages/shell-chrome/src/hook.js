// 初始化hook
if (![document.characterSet, document.charset].includes('GBK')) {
  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('src/hook-exec.js')
  script.onload = () => {
    script.remove()
  }
  ;(document.head || document.documentElement).prepend(script)
}
