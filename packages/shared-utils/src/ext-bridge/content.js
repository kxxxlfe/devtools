/* 
  web环境：content <=> web
*/
import { MsgDef, isBridgeMessage, makeWinPost } from './const'

// req/res 处理
window.addEventListener('message', async function(evt) {
  const { data: msgdata } = evt
  if (!isBridgeMessage(msgdata)) {
    return
  }
  const uuid = msgdata.uuid

  const res = await chrome.runtime.sendMessage(msgdata)
  if (msgdata.type === MsgDef.request) {
    window.postMessage(res)
  }
})

chrome.runtime.onMessage.addListener(async (msgdata, source) => {
  if (!isBridgeMessage(msgdata)) {
    return
  }

  const res = await makeWinPost(msgdata)
  if (msgdata.type === MsgDef.request) {
    chrome.runtime.sendMessage(res)
  }
})
