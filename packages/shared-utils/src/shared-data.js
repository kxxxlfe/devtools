import * as storage from './storage'
import { debug } from './util'

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
            exBridge.request(`${exBridge.Plat.web}/shared-data:ready`).then(() => {
              resolve()
              clearInterval(initRetryInterval)
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
      exBridge.send(`${exBridge.Plat.web}/shared-data:load-complete`)

      debug('[shared data] Master init complete')
      resolve()
    }
    // web
    else {
      exBridge.on(`${exBridge.Plat.web}/shared-data:ready`, () => 'ready')
      exBridge.on(`${exBridge.Plat.web}/shared-data:load-complete`, () => {
        resolve()
      })
    }

    // Wrapper Vue instance
    vm = new Vue({
      data: internalSharedData,
    })

    // Update value from other shared data clients
    exBridge.on(`${exBridge.plat}/shared-data:set`, ({ key, value }) => {
      setValue(key, value)
    })
  })
}

export function destroy() {
  exBridge.off(`${exBridge.plat}/shared-data:set`)
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
  const plat = exBridge.plat === exBridge.Plat.web ? exBridge.Plat.devtool : exBridge.Plat.web
  exBridge?.send(`${plat}/shared-data:set`, { key, value })
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
