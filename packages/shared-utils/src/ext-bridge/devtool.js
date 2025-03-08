/* 
  web环境：content <=> web
*/
import { DevtoolBridge, Plat } from '@yuhufe/browser-bridge'

export const bridge = new DevtoolBridge()
bridge.Plat = Plat

// window.devtoolBridge = bridge
// window.test = async function () {
//   const res = await bridge.request(`${Plat.web}/test`, { aaa: 1 })
//   console.log(res)
// }
// bridge.on(`${Plat.devtool}/test`, function (info) {
//   console.log('web request: ', info)
//   return { result: 'devtool ok' }
// })
