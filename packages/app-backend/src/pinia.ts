import { watch } from 'vue'
import { bridge as exBridge, api } from './bridge'
import sharedData from '@utils/shared-data'
import { stringify } from './utils'
import { set, parse } from '@utils/util'
import { debounce } from './utils'
import { engine } from './engine'

let currStoreKey = null
let pinia

const putil = {
  get: key => pinia._s.get(key),
}

export async function initPiniaBackend(rootInstances) {
  pinia = engine._.pinia(rootInstances[0])
  if (!pinia) {
    return
  }

  // 初始化
  exBridge.send(api.devtool.pinia.init, {
    storeList: Array.from(pinia._s).map(([name, store]) => {
      return {
        name,
      }
    }),
  })

  exBridge.on(api.web.pinia.select, function ({ key }) {
    currStoreKey = key
    mutationListen.sub()
    const state = makePiniaState(key)

    return {
      state: stringify(state),
    }
  })
  exBridge.on(api.web.pinia.editState, function ({ storeKey, path, value }) {
    const targetStore = putil.get(storeKey)

    set(targetStore.$state, path, parse(value, true))
    const state = makePiniaState(storeKey)

    return {
      state: stringify(state),
    }
  })

  // 热更新，此时已经有监听的key了，得重新监听下
  const storeKeyFromDevtool = await exBridge.request(api.devtool.pinia.getSelectedKey)
  currStoreKey = storeKeyFromDevtool
  mutationListen.sub()
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
    exBridge.send(api.devtool.pinia.updateState, {
      key: currStoreKey,
      state: stringify(state),
    })
  }, 300),
  sub() {
    if (!currStoreKey) {
      return
    }
    this.unsub()
    const targetStore = putil.get(currStoreKey)
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
      mutationListen.sub()
    } else {
      mutationListen.unsub()
    }
  }
)
