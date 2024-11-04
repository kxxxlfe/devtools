/* 
  web环境：content <=> web
*/
import { MsgDef, Plat, APIHandler, isBridgeMessage } from './const'

// req/res 处理
window.addEventListener(Plat.content, async function(evt) {
  const { data: msgdata } = evt
  const uuid = msgdata.uuid

  chrome.runtime.postMessage(msgdata)
})

chrome.runtime.onMessage.addEventListener((msgdata, source) => {
  if (!isBridgeMessage(msgdata)) {
    return
  }

  window.postMessage(Plat.web, msgdata)
})
