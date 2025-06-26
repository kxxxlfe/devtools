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
const internalSharedData = {
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
}

const persisted = [
  'componentNameStyle',
  'theme',
  'displayDensity',
  'recordVuex',
  'recordPinia',
  'editableProps',
  'logDetected',
  'vuexNewBackend',
  'vuexAutoload',
  'vuexGroupGettersByModule',
  'timeFormat',
]

// ---- INTERNALS ---- //

let Vue
let exBridge
// List of fields to persist to storage (disabled if 'false')
// This should be unique to each shared data client to prevent conflicts
let persist = false
// For reactivity, we wrap the data in a Vue instance
let vm

export async function init(params) {
  const { promise, resolve } = Promise.withResolvers()

  // Mandatory params
  exBridge = params.exBridge
  Vue = params.Vue
  persist = !!params.persist

  // Wrapper Vue instance
  vm = new Vue({
    data: internalSharedData,
  })

  // Update value from other shared data clients
  const sapi = exBridge.plat === PLATFORM.web ? api.web.shared : api.devtool.shared
  exBridge.on(sapi.setData, ({ key, value }) => {
    setValue(key, value)
  })

  // devtool
  if (persist) {
    debug('[shared data] Master init in progress...')

    // Load persisted fields
    persisted.forEach(key => {
      const value = storage.get(`shared-data:${key}`)
      if (value !== null) {
        internalSharedData[key] = value
      }
    })

    // web调用这个接口，说明完成了
    exBridge.on(api.devtool.shared.init, async function () {
      resolve()
      debug('[shared data] Master init complete')
      return internalSharedData
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

export function destroy() {
  vm.$destroy()
}

function setValue(key, value) {
  // Storage
  if (persist && persisted.includes(key)) {
    storage.set(`shared-data:${key}`, value)
  }
  vm[key] = value
  // Validate Proxy set trap
  return true
}

function sendValue(key, value) {
  const sapi = exBridge.plat === PLATFORM.web ? api.devtool.shared : api.web.shared
  exBridge?.send(sapi.setData, { key, value })
}

export function watch(...args) {
  vm.$watch(...args)
}

const proxy = {}
Object.keys(internalSharedData).forEach(key => {
  Object.defineProperty(proxy, key, {
    configurable: false,
    get: () => vm && vm.$data[key],
    set: value => {
      sendValue(key, value)
      setValue(key, value)
    },
  })
})

export default proxy
