import { DevtoolBridge, Plat } from '@yuhufe/browser-bridge'
import { PLATFORM, api } from '@utils/api'

export const bridge = new DevtoolBridge()
bridge.Plat = Plat

export { api }

// window.devtoolBridge = bridge
// window.test = async function () {
//   const res = await bridge.request(`${Plat.web}/test`, { aaa: 1 })
//   console.log(res)
// }
// bridge.on(`${Plat.devtool}/test`, function (info) {
//   console.log('web request: ', info)
//   return { result: 'devtool ok' }
// })
