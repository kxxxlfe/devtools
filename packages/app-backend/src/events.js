import { stringify } from '@utils/util'
import { getInstanceName } from './process'
import { bridge as exBridge, api } from './bridge'
import sharedData from '@utils/shared-data'

const internalRE = /^(?:pre-)?hook:/

export function initEventsBackend(Vue) {
  exBridge.send(api.events.reset)

  function logEvent(vm, type, eventName, payload) {
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
          instanceId: vm._uid,
          instanceName: getInstanceName(vm._self || vm),
          timestamp: Date.now(),
        })
      )
    }
  }

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
