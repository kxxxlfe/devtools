import { ref } from 'vue'
import * as storage from './storage'
import { debug } from './util'
import { api, PLATFORM } from './api'
import { waitTime } from '@utils/tools'

Promise.withResolvers =
  Promise.withResolvers ||
  function () {
    let resolve, reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })

    return { promise, resolve, reject }
  }

// Initial state
const internalSharedData = ref({
  openInEditorHost: '/',
  componentNameStyle: 'class',
  theme: 'auto',
  displayDensity: 'low',
  timeFormat: 'default',
  recordVuex: false,
  recordPinia: false,
  recordRouter: false,
  cacheVuexSnapshotsEvery: 50,
  cacheVuexSnapshotsLimit: 10,
  snapshotLoading: false,
  recordPerf: false,
  editableProps: false,
  logDetected: true,
  vuexNewBackend: false,
  vuexAutoload: false,
  vuexGroupGettersByModule: true,
})

const persisted = [
  'componentNameStyle',
  'theme',
  'displayDensity',
  'recordVuex',
  'recordPinia',
  'recordRouter',
  'editableProps',
  'logDetected',
  'vuexNewBackend',
  'vuexAutoload',
  'vuexGroupGettersByModule',
  'timeFormat',
]

// ---- INTERNALS ---- //
let exBridge
// List of fields to persist to storage (disabled if 'false')
// This should be unique to each shared data client to prevent conflicts
let persist = false

// api has 'self' and 'other'
const sapi = {
  self: {},
  other: {},
}

export async function init(params) {
  const { promise, resolve } = Promise.withResolvers()

  // Mandatory params
  exBridge = params.exBridge
  persist = !!params.persist

  // Update value from other shared data clients
  sapi.self = exBridge.plat === PLATFORM.web ? api.web.shared : api.devtool.shared
  sapi.other = exBridge.plat === PLATFORM.web ? api.devtool.shared : api.web.shared
  exBridge.on(sapi.self.setData, ({ key, value }) => {
    setValue(key, value)
  })

  // devtool
  if (persist) {
    debug('[shared data] Master init in progress...')

    // Load persisted fields
    persisted.forEach(key => {
      const value = storage.get(`shared-data:${key}`)
      if (value !== null) {
        internalSharedData.value[key] = value
      }
    })

    // web调用这个接口，说明完成了
    exBridge.on(api.devtool.shared.init, async function () {
      resolve()
      debug('[shared data] Master init complete')
      return internalSharedData.value
    })
  }
  // web
  else {
    // 初始化时获取devtool数据，同步到自身
    const devtoolSharedData = await exBridge.request(api.devtool.shared.init)
    Object.entries(devtoolSharedData).forEach(([key, value]) => {
      setValue(key, value)
    })
    resolve()
  }

  return promise
}

function setValue(key, value) {
  // Storage
  if (persist && persisted.includes(key)) {
    storage.set(`shared-data:${key}`, value)
  }
  internalSharedData.value[key] = value
  // Validate Proxy set trap
  return true
}

function sendValue(key, value) {
  exBridge?.send(sapi.other.setData, { key, value })
}

export const useSharedData = function () {
  return { sharedData: internalSharedData }
}

const proxy = new Proxy(internalSharedData, {
  get(target, prop, receiver) {
    return internalSharedData.value[prop]
  },
  set(target, prop, value, receiver) {
    sendValue(prop, value)
    setValue(prop, value)
    return true
  },
})

export default proxy
