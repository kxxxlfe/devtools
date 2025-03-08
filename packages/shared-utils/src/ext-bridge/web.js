/* 
  web环境：content <=> web
*/
import { WebBridge, Plat } from '@yuhufe/browser-bridge'

export const bridge = new WebBridge()
bridge.Plat = Plat

// window.webBridge = bridge
// window.testBridge = async function () {
//   const res = await bridge.request(`${Plat.devtool}/test`, { from: 'web' })
//   console.log('response', res)
// }
// bridge.on(`${Plat.web}/test`, function (info) {
//   console.log(info)
//   return { result: 'web ok' }
// })
