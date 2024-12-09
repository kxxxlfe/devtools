import { bridge as exBridge } from '@utils/ext-bridge/web'

let currStoreKey = null

export function initPiniaBackend(Vue, rootInstances) {
  const pinia = rootInstances[0]?.$pinia
  if (!pinia) {
    return
  }

  exBridge.send(`${exBridge.Plat.devtool}/pinia/init`, {
    storeList: Array.from(pinia._s).map(([name, store]) => {
      return {
        name,
      }
    }),
  })

  exBridge.on(`${exBridge.Plat.web}/pinia/select`, function ({ key }) {
    currStoreKey = key
  })
}
