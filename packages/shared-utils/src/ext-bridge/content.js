/* 
  web环境：content <=> web
*/
import { MsgDef, isBridgeMessage, WinPost, Plat } from './const'

const win = new WinPost({ plat: Plat.content })

// web请求转发devtool
window.addEventListener('message', async function (evt) {
  const msgdata = win.parseMsg(evt.data)
  if (!isBridgeMessage(msgdata)) {
    return
  }
  if (msgdata.type !== MsgDef.request) {
    return
  }
  const uuid = msgdata.uuid

  const res = await chrome.runtime.sendMessage(msgdata)
  win.response({ request: evt.data, response: res })
})

// devtool请求转发web
chrome.runtime.onMessage.addListener((msgdata, source, sendResponse) => {
  if (!isBridgeMessage(msgdata)) {
    return
  }
  if (msgdata.type !== MsgDef.request) {
    return
  }

  ;(async function () {
    const res = await win.post(msgdata)
    sendResponse(res)
  })()

  return true
})
