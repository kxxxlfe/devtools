const detector = e => {
  if (e?.source === window && e?.data?.vueDetected) {
    chrome.runtime.sendMessage(e.data)
    window.removeEventListener('message', detector)
  }
}

window.addEventListener('message', detector)

const script = document.createElement('script')
script.src = chrome.runtime.getURL('build/detector-exec.js')
script.onload = () => {
  script.remove()
}
;(document.head || document.documentElement).appendChild(script)
