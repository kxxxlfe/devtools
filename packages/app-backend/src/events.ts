import { stringify, getHook } from './utils'
import { getEngine } from './engine'
import { bridge as exBridge, api } from './bridge'
import sharedData from '@utils/shared-data'

const internalRE = /^(?:pre-)?hook:/

function logEvent(vm, type, eventName, payload) {
  const engine = getEngine(vm)
  // The string check is important for compat with 1.x where the first
  // argument may be an object instead of a string.
  // this also ensures the event is only logged for direct $emit (source)
  // instead of by $dispatch/$broadcast
  if (typeof eventName === 'string' && !internalRE.test(eventName)) {
    exBridge.send(
      api.events.triggered,
      stringify({
        eventName,
        type,
        payload,
        instanceId: engine.uid(vm),
        instanceName: engine.getInstanceName(vm._self || vm),
        timestamp: Date.now(),
      })
    )
  }
}

function initEventsVue2Backend(Vue) {
  function wrap(method) {
    const original = Vue.prototype[method]
    if (original) {
      Vue.prototype[method] = function (...args) {
        const res = original.apply(this, args)
        if (sharedData.recordEvent) {
          logEvent(this, method, args[0], args.slice(1))
        }
        return res
      }
    }
  }

  wrap('$emit')
  wrap('$broadcast')
  wrap('$dispatch')
}

function initEventsVue3Backend(hook) {
  hook.on('component:emit', (_app: any, _component: any, event: string, params: any) => {
    if (!sharedData.recordEvent) return
    logEvent(_component, 'emit', event, params)
  })
}

export function initEventsBackend() {
  exBridge.send(api.events.reset)

  const hook = getHook()
  const Vue = hook?.Vue

  return Vue ? initEventsVue2Backend(Vue) : initEventsVue3Backend(hook)
}
