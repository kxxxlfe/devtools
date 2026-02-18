import Vue from 'vue'
import { DevtoolBridge, IFrameTopBridge, Plat } from '@yuhufe/browser-bridge'
import { PLATFORM, api, detectDev } from '@vue-devtools/shared-utils'

const bridge = detectDev('frontend')
  ? new IFrameTopBridge({
      plat: PLATFORM.devtool,
      frameKey: PLATFORM.web,
      frameEl: () => document.querySelector('#target'),
    })
  : new DevtoolBridge({ plat: PLATFORM.devtool })
bridge.Plat = Plat

const CHUNK_SIZE = 1024 * 1024 * 5 // 分块儿
// 发送数据量大，使用chunk
bridge.requestChunk = function (path, params) {
  return bridge.request(path, params, { chunk: { size: CHUNK_SIZE } })
}

export { api, bridge }

export const eventBus = new Vue()

// window.devtoolBridge = bridge
// window.test = async function () {
//   const res = await bridge.request(`${Plat.web}/test`, { aaa: 1 })
//   console.log(res)
// }
// bridge.on(`${Plat.devtool}/test`, function (info) {
//   console.log('web request: ', info)
//   return { result: 'devtool ok' }
// })
