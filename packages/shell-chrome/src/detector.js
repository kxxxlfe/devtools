import { ContentBridge } from '@yuhufe/browser-bridge'
import { PLATFORM } from '@utils/api'

// 用于bridge转发
new ContentBridge({ platWeb: PLATFORM.web })

const script = document.createElement('script')
script.src = chrome.runtime.getURL('src/detector-exec.js')
script.onload = () => {
  script.remove()
}
;(document.head || document.documentElement).appendChild(script)
