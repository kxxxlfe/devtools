import { watch } from 'vue'
import { bridge as exBridge } from '@utils/ext-bridge/web'
import sharedData from '@utils/shared-data'
import { stringify, set, parse } from '@utils/util'
import { debounce } from './utils'

let currStoreKey = null
let pinia

const putil = {
  get: key => pinia._s.get(key),
}

export function initPiniaBackend(Vue, rootInstances) {
  pinia = rootInstances[0]?.$pinia
  if (!pinia) {
    return
  }

  // 初始化
  exBridge.send(`${exBridge.Plat.devtool}/pinia/init`, {
    storeList: Array.from(pinia._s).map(([name, store]) => {
      return {
        name,
      }
    }),
  })

  exBridge.on(`${exBridge.Plat.web}/pinia/select`, function ({ key }) {
    currStoreKey = key
    mutationListen.sub(key)
    const state = makePiniaState(key)

    return {
      state: stringify(state),
    }
  })
  exBridge.on(`${exBridge.Plat.web}/pinia/editState`, function ({ storeKey, path, value }) {
    const targetStore = putil.get(storeKey)

    set(targetStore.$state, path, parse(value, true))
    const state = makePiniaState(storeKey)

    return {
      state: stringify(state),
    }
  })
}

// 制作某个store的state
const makePiniaState = function (key) {
  const targetStore = putil.get(key)
  const { $state } = targetStore

  const state = {}
  const computed = {}
  const actions = {}
  Object.entries(targetStore).forEach(([key, value]) => {
    if (
      [
        '$dispose',
        '$id',
        '$onAction',
        '$patch',
        '$reset',
        '$subscribe',
        '_hotUpdate',
        '_isOptionsAPI',
        '_r',
        '_p',
      ].includes(key)
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

// store的监听和解除监听
const mutationListen = {
  onMutation: debounce(() => {
    if (!sharedData.recordPinia) {
      return
    }
    if (!currStoreKey) {
      return
    }
    const state = makePiniaState(currStoreKey)
    exBridge.send(`${exBridge.Plat.devtool}/pinia/updateState`, {
      key: currStoreKey,
      state: stringify(state),
    })
  }, 300),
  sub(key) {
    if (!key) {
      return
    }
    this.unsub()
    const targetStore = putil.get(key)
    this.unsubscribe = targetStore.$subscribe((mutation, state) => {
      this.onMutation()
    })
  },
  unsub() {
    this.unsubscribe?.()
  },
}
watch(
  () => sharedData.recordPinia,
  value => {
    if (value) {
      mutationListen.sub(currStoreKey)
    } else {
      mutationListen.unsub()
    }
  }
)
