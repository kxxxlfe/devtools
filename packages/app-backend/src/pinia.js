import { bridge as exBridge } from '@utils/ext-bridge/web'
import sharedData from '@utils/shared-data'
import { stringify } from '@utils/util'

let currStoreKey = null

const makePiniaState = function (pinia, key) {
  const targetStore = pinia._s.get(key)
  const { $state } = targetStore

  const state = {}
  const computed = {}
  const actions = {}
  Object.entries(targetStore).forEach(([key, value]) => {
    if (
      ['$dispose', '$id', '$onAction', '$patch', '$reset', '$subscribe', '_hotUpdate', '_isOptionsAPI', '_r'].includes(
        key
      )
    ) {
      return
    }

    if (Reflect.has($state, key)) {
      state[key] = value
    } else if (typeof value === 'function') {
      actions[key] = value
    } else {
      computed[key] = value
    }
  })

  return {
    state,
    computed,
    actions,
  }
}

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
    const state = makePiniaState(pinia, key)

    return {
      state: stringify(state),
    }
  })
}
