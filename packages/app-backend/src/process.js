// 循环引用了，这里放纯工具方法
import { isRef } from 'vue'
import { camelize, getComponentName, getCustomRefDetails } from '@utils/util'
import SharedData from '@utils/shared-data'

export function getInstanceState(instance) {
  return processProps(instance).concat(
    processState(instance),
    processRefs(instance),
    processSetupState(instance),
    processComputed(instance),
    processInjected(instance),
    processRouteContext(instance),
    processVuexGetters(instance),
    processFirebaseBindings(instance),
    processObservables(instance),
    processAttrs(instance)
  )
}

export function getCustomInstanceDetails(instance) {
  const state = getInstanceState(instance)
  return {
    _custom: {
      type: 'component',
      id: instance.__VUE_DEVTOOLS_UID__,
      display: getInstanceName(instance),
      tooltip: 'Component instance',
      value: reduceStateList(state),
      fields: {
        abstract: true,
      },
    },
  }
}

function reduceStateList(list) {
  if (!list.length) {
    return undefined
  }
  return list.reduce((map, item) => {
    const key = item.type || 'data'
    const obj = (map[key] = map[key] || {})
    obj[item.key] = item.value
    return map
  }, {})
}

/**
 * Get the appropriate display name for an instance.
 *
 * @param {Vue} instance
 * @return {String}
 */

export function getInstanceName(instance) {
  const name = getComponentName(instance.$options || instance.fnOptions || {})
  if (name) return name
  return instance.$root === instance ? 'Root' : 'Anonymous Component'
}

/**
 * Process the props of an instance.
 * Make sure return a plain object because window.postMessage()
 * will throw an Error if the passed object contains Functions.
 *
 * @param {Vue} instance
 * @return {Array}
 */
let isLegacy = false
const propModes = ['default', 'sync', 'once']

function processProps(instance) {
  let props
  if (isLegacy && (props = instance._props)) {
    // 1.x
    return Object.keys(props).map(key => {
      const prop = props[key]
      const options = prop.options
      return {
        type: 'props',
        key: prop.path,
        value: instance[prop.path],
        meta: options
          ? {
              type: options.type ? getPropType(options.type) : 'any',
              required: !!options.required,
              mode: propModes[prop.mode],
            }
          : {},
      }
    })
  } else if ((props = instance.$options.props)) {
    // 2.0
    const propsData = []
    for (let key in props) {
      const prop = props[key]
      key = camelize(key)
      propsData.push({
        type: 'props',
        key,
        value: instance[key],
        meta: prop
          ? {
              type: prop.type ? getPropType(prop.type) : 'any',
              required: !!prop.required,
            }
          : {
              type: 'invalid',
            },
        editable: SharedData.editableProps,
      })
    }
    return propsData
  } else {
    return []
  }
}

function processAttrs(instance) {
  return Object.entries(instance.$attrs || {}).map(([key, value]) => {
    return {
      type: '$attrs',
      key,
      value,
    }
  })
}

/**
 * Convert prop type constructor to string.
 *
 * @param {Function} fn
 */

const fnTypeRE = /^(?:function|class) (\w+)/
function getPropType(type) {
  const match = type.toString().match(fnTypeRE)
  return typeof type === 'function' ? (match && match[1]) || 'any' : 'any'
}

/**
 * Process state, filtering out props and "clean" the result
 * with a JSON dance. This removes functions which can cause
 * errors during structured clone used by window.postMessage.
 *
 * @param {Vue} instance
 * @return {Array}
 */

function processState(instance) {
  const props = isLegacy ? instance._props : instance.$options.props
  const getters = instance.$options.vuex && instance.$options.vuex.getters
  return Object.keys(instance._data)
    .filter(key => !(props && key in props) && !(getters && key in getters))
    .map(key => ({
      key,
      value: instance._data[key],
      editable: true,
    }))
}

/**
 * Process refs
 *
 * @param {Vue} instance
 * @return {Array}
 */

function processRefs(instance) {
  return Object.keys(instance.$refs)
    .filter(key => instance.$refs[key])
    .map(key => getCustomRefDetails(instance, key, instance.$refs[key]))
}

/**
 * Process refs
 *
 * @param {Vue} instance
 * @return {Array}
 */

function processSetupState(instance) {
  const states = []
  Object.entries(instance._setupState || {}).forEach(([key, value]) => {
    if (typeof value === 'function') {
      return
    }
    value = isRef(value) ? value.value : value
    if (instance.$refs[key] && value === instance.$refs[key]) {
      return
    }
    states.push({
      type: 'setup',
      key,
      value: isRef(value) ? value.value : value,
    })
  })

  return states
}

/**
 * Process the computed properties of an instance.
 *
 * @param {Vue} instance
 * @return {Array}
 */

function processComputed(instance) {
  const computed = []
  const defs = instance.$options.computed || {}
  // use for...in here because if 'computed' is not defined
  // on component, computed properties will be placed in prototype
  // and Object.keys does not include
  // properties from object's prototype
  for (const key in defs) {
    const def = defs[key]
    // @Ref 计算属性不处理
    if (def.cache === false && !Reflect.hasOwnProperty(def, 'set')) {
      if (Object.values(instance.$refs).find(comp => comp === instance[key])) {
        continue
      }
    }
    const type = typeof def === 'function' && def.vuex ? 'vuex bindings' : 'computed'
    // use try ... catch here because some computed properties may
    // throw error during its evaluation
    let computedProp = null
    try {
      computedProp = {
        type,
        key,
        value: instance[key],
      }
    } catch (e) {
      computedProp = {
        type,
        key,
        value: '(error during evaluation)',
      }
    }

    computed.push(computedProp)
  }

  return computed
}

/**
 * Process Vuex getters.
 *
 * @param {Vue} instance
 * @return {Array}
 */

function processInjected(instance) {
  const injected = instance.$options.inject

  if (injected) {
    return Object.keys(injected).map(key => {
      return {
        key,
        type: 'injected',
        value: instance[key],
      }
    })
  } else {
    return []
  }
}

/**
 * Process possible vue-router $route context
 *
 * @param {Vue} instance
 * @return {Array}
 */

function processRouteContext(instance) {
  try {
    const route = instance.$route
    if (route) {
      const { path, query, params } = route
      const value = { path, query, params }
      if (route.fullPath) value.fullPath = route.fullPath
      if (route.hash) value.hash = route.hash
      if (route.name) value.name = route.name
      if (route.meta) value.meta = route.meta
      return [
        {
          key: '$route',
          value: {
            _custom: {
              type: 'router',
              abstract: true,
              value,
            },
          },
        },
      ]
    }
  } catch (e) {
    // Invalid $router
  }
  return []
}

/**
 * Process Vuex getters.
 *
 * @param {Vue} instance
 * @return {Array}
 */

function processVuexGetters(instance) {
  const getters = instance.$options.vuex && instance.$options.vuex.getters
  if (getters) {
    return Object.keys(getters).map(key => {
      return {
        type: 'vuex getters',
        key,
        value: instance[key],
      }
    })
  } else {
    return []
  }
}

/**
 * Process Firebase bindings.
 *
 * @param {Vue} instance
 * @return {Array}
 */

function processFirebaseBindings(instance) {
  const refs = instance.$firebaseRefs
  if (refs) {
    return Object.keys(refs).map(key => {
      return {
        type: 'firebase bindings',
        key,
        value: instance[key],
      }
    })
  } else {
    return []
  }
}

/**
 * Process vue-rx observable bindings.
 *
 * @param {Vue} instance
 * @return {Array}
 */

function processObservables(instance) {
  const obs = instance.$observables
  if (obs) {
    return Object.keys(obs).map(key => {
      return {
        type: 'observables',
        key,
        value: instance[key],
      }
    })
  } else {
    return []
  }
}
