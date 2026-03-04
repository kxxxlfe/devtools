/**
 * Stringify/parse data using CircularJSON.
 * Migrated from shared-utils util.js - only app-backend needs vue version and stringify.
 */
import { isRef } from 'vue'
import * as CircularJSON from '@utils/transfer'
import { getComponentName } from '@utils/util'
import { getCustomInstanceDetails } from './process'

export const UNDEFINED = '__vue_devtool_undefined__'
export const INFINITY = '__vue_devtool_infinity__'
export const NEGATIVE_INFINITY = '__vue_devtool_negative_infinity__'
export const NAN = '__vue_devtool_nan__'

export const SPECIAL_TOKENS = {
  true: true,
  false: false,
  undefined: UNDEFINED,
  null: null,
  '-Infinity': NEGATIVE_INFINITY,
  Infinity: INFINITY,
  NaN: NAN,
}

export const MAX_STRING_SIZE = 10000
export const MAX_ARRAY_SIZE = 500
const MAX_BYTE_SIZE = 512 * 1024

function calcMaxArraySize(arr: any[]): number {
  if (arr.length <= 100) {
    return arr.length
  }
  if (typeof arr[0] !== 'object') {
    return 10000
  }
  if (['uid', 'consoleId', 'renderKey'].every(key => Reflect.has(arr[0], key))) {
    return 10000
  }
  try {
    const sampleByteSize = JSON.stringify(arr[0]).length
    return Math.floor(MAX_BYTE_SIZE / sampleByteSize)
  } catch (e) {
    // ignore
  }
  return 500
}

export function specialTokenToString(value: any): string | false {
  if (value === null) return 'null'
  if (value === UNDEFINED) return 'undefined'
  if (value === NAN) return 'NaN'
  if (value === INFINITY) return 'Infinity'
  if (value === NEGATIVE_INFINITY) return '-Infinity'
  return false
}

class EncodeCache {
  map = new Map<any, any>()
  cache<T>(data: any, factory: (data: any) => T): T {
    const cached = this.map.get(data)
    if (cached !== undefined) return cached
    const result = factory(data)
    this.map.set(data, result)
    return result
  }
  clear() {
    this.map.clear()
  }
}

const encodeCache = new EncodeCache()

const ESC: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '&': '&amp;',
}
function escape(s: string): string {
  return s.replace(/[<>"&]/g, a => ESC[a] || a)
}

function isPlainObject(obj: any): boolean {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

function isPrimitive(data: any): boolean {
  if (data == null) return true
  const type = typeof data
  return type === 'string' || type === 'number' || type === 'boolean'
}

function sanitize(data: any): any {
  if (!isPrimitive(data) && !Array.isArray(data) && !isPlainObject(data)) {
    return Object.prototype.toString.call(data)
  }
  return data
}

export function getCustomMapDetails(val: Map<any, any>) {
  const list: { key: any; value: any }[] = []
  val.forEach((value, key) => list.push({ key, value }))
  return {
    _custom: {
      type: 'map',
      display: 'Map',
      value: list,
      readOnly: true,
      fields: { abstract: true },
    },
  }
}

export function getCustomSetDetails(val: Set<any>) {
  const list = Array.from(val)
  return {
    _custom: {
      type: 'set',
      display: `Set[${list.length}]`,
      value: list,
      readOnly: true,
    },
  }
}

export function getCustomComponentDefinitionDetails(def: any) {
  let display = getComponentName(def)
  if (display) {
    if (def.name && def.__file) {
      display += ` <span>(${def.__file})</span>`
    }
  } else {
    display = '<i>Unknown Component</i>'
  }
  return {
    _custom: {
      type: 'component-definition',
      display,
      tooltip: 'Component definition',
      ...(def.__file ? { file: def.__file } : {}),
    },
  }
}

function getCustomFunctionDetails(func: Function) {
  let string = ''
  let matches: RegExpMatchArray | null = null
  try {
    string = Function.prototype.toString.call(func)
    matches = String.prototype.match.call(string, /\([\s\S]*?\)/)
  } catch (e) {
    // Func is probably a Proxy
  }
  const match = matches && matches[0]
  const args =
    typeof match === 'string'
      ? `(${match
          .substr(1, match.length - 2)
          .split(',')
          .map(a => a.trim())
          .join(', ')})`
      : '(?)'
  const name = typeof (func as any).name === 'string' ? (func as any).name : ''
  return {
    _custom: {
      type: 'function',
      display: `<span>ƒ</span> ${escape(name)}${args}`,
    },
  }
}

function replacer(key: string, val: any): any {
  const type = typeof val
  if (Array.isArray(val)) {
    const l = val.length
    const maxSize = calcMaxArraySize(val)
    if (l > maxSize) {
      return { _isArray: true, length: l, items: val.slice(0, maxSize) }
    }
    return val
  }
  if (typeof val === 'string') {
    if (val.length > MAX_STRING_SIZE) {
      return val.substr(0, MAX_STRING_SIZE) + `... (${val.length} total length)`
    }
    return val
  }
  if (type === 'undefined') return UNDEFINED
  if (val === Infinity) return INFINITY
  if (val === -Infinity) return NEGATIVE_INFINITY
  if (type === 'function') return getCustomFunctionDetails(val)
  if (type === 'symbol') {
    return `[native Symbol ${Symbol.prototype.toString.call(val)}]`
  }
  if (val !== null && type === 'object') {
    const proto = Object.prototype.toString.call(val)
    if (proto === '[object Map]') return encodeCache.cache(val, () => getCustomMapDetails(val))
    if (proto === '[object Set]') return encodeCache.cache(val, () => getCustomSetDetails(val))
    if (proto === '[object RegExp]') return `[native RegExp ${RegExp.prototype.toString.call(val)}]`
    if (proto === '[object Date]') return `[native Date ${Date.prototype.toString.call(val)}]`
    if (proto === '[object Error]') return `[native Error ${(val as Error).message}]`
    if (val.state && val._vm) return encodeCache.cache(val, () => getCustomStoreDetails(val))
    if (val.constructor?.name === 'VueRouter') return encodeCache.cache(val, () => getCustomRouterDetails(val))
    if (val._isVue || val.vnode) return encodeCache.cache(val, () => getCustomInstanceDetails(val))
    if (typeof val.render === 'function') return encodeCache.cache(val, () => getCustomComponentDefinitionDetails(val))
    if (
      val.constructor?.name?.startsWith('VNode') ||
      ['tag', 'elm', 'componentInstance', 'asyncFactory'].every(k => Reflect.has(val, k))
    ) {
      return `[native VNode <${val.tag}>]`
    }
    if (isRef(val)) return val.value
  }
  if (Number.isNaN(val)) return NAN
  return sanitize(val)
}

export function stringify(data: any) {
  encodeCache.clear()
  return CircularJSON.stringify(data, replacer) as string
}

export function stringifyFlatted(data: any): string {
  CircularJSON.jsonTool.useFlatted()
  const result = stringify(data)
  CircularJSON.jsonTool.reset()
  return result
}

export function cloneVueData(data: any): any {
  const cache = new Map<any, any>()
  function processReplace(value: any, key: any): any {
    if (cache.has(value)) return cache.get(value)
    const res = replacer(key, value)
    cache.set(value, res)
    if (!res || typeof res !== 'object') return res
    if (Array.isArray(res)) {
      return res.map((item, index) => {
        const processed = processReplace(item, index)
        return processed !== undefined ? processed : null
      })
    }
    const result: Record<string, any> = {}
    for (const k in res) {
      const processed = processReplace(res[k], k)
      result[k] = processed !== undefined ? processed : null
    }
    return result
  }
  return processReplace(data, undefined)
}

function getCustomRouterDetails(router) {
  return {
    _custom: {
      type: 'router',
      display: 'VueRouter',
      value: {
        options: router.options,
        currentRoute: router.currentRoute,
      },
      fields: {
        abstract: true,
      },
    },
  }
}

export function getCatchedGetters(store) {
  const getters = {}

  const origGetters = store.getters || {}
  const keys = Object.keys(origGetters)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    Object.defineProperty(getters, key, {
      enumerable: true,
      get: () => {
        try {
          return origGetters[key]
        } catch (e) {
          return e
        }
      },
    })
  }

  return getters
}
export function getCustomStoreDetails(store) {
  return {
    _custom: {
      type: 'store',
      display: 'Store',
      value: {
        state: store.state,
        getters: getCatchedGetters(store),
      },
      fields: {
        abstract: true,
      },
    },
  }
}
