import { DevtoolBridge, IFrameTopBridge, Plat } from '@yuhufe/browser-bridge'
import { PLATFORM, api } from '@utils/api'

const isWebEnv = location.href.startsWith('http')
export const bridge = window.isShellDev
  ? new IFrameTopBridge({
      plat: PLATFORM.devtool,
      frameKey: PLATFORM.web,
      frameEl: () => document.querySelector('#target'),
    })
  : new DevtoolBridge({ plat: PLATFORM.devtool })
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
