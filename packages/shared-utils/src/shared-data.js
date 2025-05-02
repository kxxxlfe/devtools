import * as storage from './storage'
import { debug } from './util'
import { api, PLATFORM } from './api'

// Initial state
const internalSharedData = {
  openInEditorHost: '/',
  componentNameStyle: 'class',
  theme: 'auto',
  displayDensity: 'low',
  timeFormat: 'default',
  recordVuex: false,
  recordPinia: false,
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

let initRetryInterval
let initRetryCount = 0

export function init(params) {
  return new Promise(async (resolve, reject) => {
    // Mandatory params
    exBridge = params.exBridge
    Vue = params.Vue
    persist = !!params.persist

    // devtool
    if (persist) {
      debug('[shared data] Master init in progress...')
      const webReady = async function () {
        return new Promise(resolve => {
          const checkReady = () =>
            exBridge
              .request(api.web.shared.ready)
              .then(() => {
                resolve()
                clearInterval(initRetryInterval)
              })
              .catch(e => {
                debug('shared-data:ready catch', e.message)
              })
          initRetryCount = 0
          clearInterval(initRetryInterval)
          initRetryInterval = setInterval(() => {
            debug('[shared data] Master init retrying...')
            checkReady()
            initRetryCount++
            if (initRetryCount > 30) {
              clearInterval(initRetryInterval)
              console.error('[shared data] Master init failed')
            }
          }, 1000)
          checkReady()
        })
      }

      // Load persisted fields
      persisted.forEach(key => {
        const value = storage.get(`shared-data:${key}`)
        if (value !== null) {
          internalSharedData[key] = value
        }
      })

      await webReady()

      // Send all fields
      Object.keys(internalSharedData).forEach(key => {
        sendValue(key, internalSharedData[key])
      })
      exBridge.send(api.web.shared.loadComplete)

      debug('[shared data] Master init complete')
      resolve()
    }
    // web
    else {
      exBridge.on(api.web.shared.ready, () => 'ready')
      exBridge.on(api.web.shared.loadComplete, () => {
        resolve()
      })
    }

    // Wrapper Vue instance
    vm = new Vue({
      data: internalSharedData,
    })

    // Update value from other shared data clients
    const sapi = exBridge.plat === PLATFORM.web ? api.web.shared : api.devtool.shared
    exBridge.on(sapi.setData, ({ key, value }) => {
      setValue(key, value)
    })
  })
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
