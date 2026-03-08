// 循环引用了，这里放纯工具方法
import { isRef, isReadonly, isReactive } from 'vue'
import { camelize } from '@utils/util'
import SharedData from '@utils/shared-data'
import { engine } from '../engine'
import { getHook } from './utils'

const hook = getHook()
const isLegacy = () => getHook()?.env?.verNum === 1

// 判断数据是否响应式
const checkReact = function ({ key, val, host }: { key: string; val: unknown; host: Record<string, unknown> }) {
  if (typeof val === 'object') {
    return isRef(val) || isReactive(val)
  }

  const descriptor = Object.getOwnPropertyDescriptor(host, key)

  if (descriptor?.get && descriptor?.set) {
    return true
  }

  return
}

export function getInstanceState(instance: any) {
  return [
    processProps(instance),
    processState(instance),
    processRefs(instance),
    ...processSetup(instance),
    processComputed(instance),
    processInjected(instance),
    processRouteContext(instance),
    processVuexGetters(instance),
    processFirebaseBindings(instance),
    processObservables(instance),
    processAttrs(instance),
  ].flat()
}

export function getCustomInstanceDetails(instance: any) {
  const state = getInstanceState(instance)
  return {
    _custom: {
      type: 'component',
      id: instance.__VUE_DEVTOOLS_UID__,
      display: engine.getInstanceName(instance),
      tooltip: 'Component instance',
      value: reduceStateList(state),
      fields: {
        abstract: true,
      },
    },
  }
}

function reduceStateList(list: any[]) {
  if (!list.length) {
    return undefined
  }
  return list.reduce((map: Record<string, Record<string, unknown>>, item: any) => {
    const key = item.type || 'data'
    const obj = (map[key] = map[key] || {})
    obj[item.key] = item.value
    return map
  }, {})
}

const propModes = ['default', 'sync', 'once']

export function processProps(instance: any) {
  let props: Record<string, any> | undefined
  const verNum = getHook().env?.verNum
  if (verNum === 1) {
    props = instance._props
    return Object.keys(props).map(key => {
      const prop = props![key]
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
  } else if (verNum === 2) {
    props = instance.$options?.props
    const propsData: any[] = []
    for (const key in props) {
      const prop = props[key]
      const camelKey = camelize(key)
      propsData.push({
        type: 'props',
        key: camelKey,
        value: instance[camelKey],
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
  } else if (verNum === 3) {
    // Vue 3: instance.props 为已解析的 props，instance.type?.props 为定义
    const propsData = instance.props
    const propsOptions = instance.type?.props
    return Object.keys(propsData || {}).map(key => {
      const prop = propsOptions?.[key]
      return {
        type: 'props',
        key,
        value: propsData[key],
        meta: prop
          ? {
              type: prop.type ? getPropType(prop.type) : 'any',
              required: !!prop.required,
            }
          : { type: 'any' },
        editable: SharedData.editableProps,
      }
    })
  } else {
    return []
  }
}

function processAttrs(instance: any) {
  return Object.entries(instance.$attrs || {}).map(([key, value]) => ({
    type: '$attrs',
    key,
    value,
  }))
}

const fnTypeRE = /^(?:function|class) (\w+)/
function getPropType(type: any): string {
  const match = type.toString().match(fnTypeRE)
  return typeof type === 'function' ? (match && match[1]) || 'any' : 'any'
}

function processState(instance: any) {
  const data = engine._.data(instance)
  return Object.entries(data).map(([key, value]) => ({
    key,
    value,
    editable: true,
  }))
}

function processRefs(instance: any) {
  const refs = engine._.refs(instance)
  return Object.keys(refs)
    .filter(key => refs[key])
    .map(key => getCustomRefDetails(instance, key, refs[key]))
}

function getCustomRefDetails(instance, key, ref) {
  let value
  if (Array.isArray(ref)) {
    value = ref.map(r => getCustomRefDetails(instance, key, r)).map(data => data.value)
  } else {
    let name
    // ref为代理实例
    if (ref._isVue || ref.$?.vnode) {
      name = engine.getInstanceName(ref)
    } else {
      name = ref.tagName.toLowerCase()
    }

    value = {
      _custom: {
        display:
          `&lt;${name}` +
          (ref.id ? ` <span class="attr-title">id</span>="${ref.id}"` : '') +
          (ref.className ? ` <span class="attr-title">class</span>="${ref.className}"` : '') +
          '&gt;',
        uid: instance.__VUE_DEVTOOLS_UID__,
        type: 'reference',
      },
    }
  }
  return {
    type: '$refs',
    key: key,
    value,
    editable: false,
  }
}

function processSetup(instance: any) {
  const states: any[] = []
  const computes: any[] = []
  const setupState = engine._.setupState(instance)
  const refs = engine._.refs(instance)

  Object.entries(setupState).forEach(([key, value]: [string, any]) => {
    if (typeof value === 'function') {
      return
    }
    const val = isRef(value) ? value.value : value
    if (refs?.[key] && val === refs[key]) {
      return
    }

    if (isReadonly(value)) {
      computes.push({
        type: 'setup.computed',
        key,
        value: val,
      })
    } else {
      states.push({
        type: 'setup.state/ref',
        key,
        value: val,
        editable: true,
      })
    }
  })

  return [states, computes]
}

function processComputed(instance: any) {
  const computed: any[] = []
  const defs = instance.$options?.computed || {}
  for (const key in defs) {
    const def = defs[key]
    if (def.cache === false && !Object.prototype.hasOwnProperty.call(def, 'set')) {
      if (Object.values(instance.$refs || {}).find((comp: any) => comp === instance[key])) {
        continue
      }
    }
    const type = typeof def === 'function' && def.vuex ? 'vuex bindings' : 'computed'
    let computedProp: any = null
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

function processInjected(instance: any) {
  const injected = engine._.inject(instance)
  if (injected) {
    return Object.entries(injected).map(([key, val]) => ({
      key,
      type: 'injected',
      value: val,
    }))
  }
  return []
}

function processRouteContext(instance: any) {
  try {
    const route = engine._.route(instance)
    if (route) {
      const { path, query, params } = route
      const value: any = { path, query, params }
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

function processVuexGetters(instance: any) {
  const getters = instance.$options?.vuex?.getters
  if (getters) {
    return Object.keys(getters).map(key => ({
      type: 'vuex getters',
      key,
      value: instance[key],
    }))
  }
  return []
}

function processFirebaseBindings(instance: any) {
  const refs = instance.$firebaseRefs
  if (refs) {
    return Object.keys(refs).map(key => ({
      type: 'firebase bindings',
      key,
      value: instance[key],
    }))
  }
  return []
}

function processObservables(instance: any) {
  const obs = instance.$observables
  if (obs) {
    return Object.keys(obs).map(key => ({
      type: 'observables',
      key,
      value: instance[key],
    }))
  }
  return []
}
