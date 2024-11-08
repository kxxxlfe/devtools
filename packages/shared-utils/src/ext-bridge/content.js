/* 
  web环境：content <=> web
*/
import { MsgDef, isBridgeMessage, WinPost, Plat } from './const'

const win = new WinPost({ plat: Plat.content })

// web请求转发devtool
window.addEventListener('message', async function (evt) {
  const { data: msgdata } = evt
  if (!isBridgeMessage(msgdata)) {
    return
  }
  if (msgdata.type !== MsgDef.request) {
    return
  }
  const uuid = msgdata.uuid

  const res = await chrome.runtime.sendMessage(msgdata)
  window.postMessage(res)
})

// devtool请求转发web
chrome.runtime.onMessage.addListener(async (msgdata, source) => {
  if (!isBridgeMessage(msgdata)) {
    return
  }
  if (msgdata.type !== MsgDef.request) {
    return
  }

  const res = await win.post(msgdata)
  chrome.runtime.sendMessage(res)
})
