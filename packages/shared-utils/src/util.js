import path from 'path-browserify'
import { transform, cloneDeepWith, cloneDeep } from 'lodash-es'
import * as CircularJSON from './transfer'
import SharedData from './shared-data'
import { isChrome } from './env'

function cached(fn) {
  const cache = Object.create(null)
  return function cachedFn(str) {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }
}

const classifyRE = /(?:^|[-_/])(\w)/g
export const classify = cached(str => {
  return str && str.replace(classifyRE, toUpper)
})

const camelizeRE = /-(\w)/g
export const camelize = cached(str => {
  return str.replace(camelizeRE, toUpper)
})

const kebabizeRE = /([a-z0-9])([A-Z])/g
export const kebabize = cached(str => {
  return (
    str &&
    str
      .replace(kebabizeRE, (_, lowerCaseCharacter, upperCaseLetter) => {
        return `${lowerCaseCharacter}-${upperCaseLetter}`
      })
      .toLowerCase()
  )
})

function toUpper(_, c) {
  return c ? c.toUpperCase() : ''
}

export function getComponentDisplayName(originalName, style = 'class') {
  switch (style) {
    case 'class':
      return classify(originalName)
    case 'kebab':
      return kebabize(originalName)
    case 'original':
    default:
      return originalName
  }
}

export function inDoc(node) {
  if (!node) return false
  const doc = node.ownerDocument.documentElement
  const parent = node.parentNode
  return doc === node || doc === parent || !!(parent?.nodeType === 1 && doc.contains(parent))
}

// Token constants used by searchDeepInObject and parse (frontend); stringify lives in app-backend
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

export function specialTokenToString(value) {
  if (value === null) return 'null'
  if (value === UNDEFINED) return 'undefined'
  if (value === NAN) return 'NaN'
  if (value === INFINITY) return 'Infinity'
  if (value === NEGATIVE_INFINITY) return '-Infinity'
  return false
}

// instanceMap set by app-backend for reviver; frontend has no map so component stays _custom
let instanceMap = new Map()
export const setInstanceMap = function (inst) {
  instanceMap = inst
}

function reviveMap(val) {
  const result = new Map()
  const list = val._custom.value
  for (let i = 0; i < list.length; i++) {
    const { key, value } = list[i]
    result.set(key, reviver(null, value))
  }
  return result
}

function reviveSet(val) {
  const result = new Set()
  const list = val._custom.value
  for (let i = 0; i < list.length; i++) {
    result.add(reviver(null, list[i]))
  }
  return result
}

const specialTypeRE = /^\[native (\w+) (.*)\]$/
const symbolRE = /^\[native Symbol Symbol\((.*)\)\]$/

function reviver(key, val) {
  if (val === UNDEFINED) return undefined
  if (val === INFINITY) return Infinity
  if (val === NEGATIVE_INFINITY) return -Infinity
  if (val === NAN) return NaN
  if (val && val._custom) {
    if (val._custom.type === 'component') return instanceMap.get(val._custom.id) ?? val
    if (val._custom.type === 'map') return reviveMap(val)
    if (val._custom.type === 'set') return reviveSet(val)
  }
  if (typeof val === 'string' && symbolRE.test(val)) {
    const [, string] = symbolRE.exec(val)
    return Symbol.for(string)
  }
  if (typeof val === 'string' && specialTypeRE.test(val)) {
    const [, type, string] = specialTypeRE.exec(val)
    return new window[type](string)
  }
  return val
}

export function parse(data, revive) {
  return revive ? CircularJSON.parse(data, reviver) : CircularJSON.parse(data)
}

export function parseFlatted(data, { revive = false } = {}) {
  CircularJSON.jsonTool.useFlatted()
  const res = revive ? CircularJSON.parse(data, reviver) : CircularJSON.parse(data)
  CircularJSON.jsonTool.reset()
  return res
}

// Use a custom basename functions instead of the shimed version
// because it doesn't work on Windows
export function basename(filename, ext) {
  let fname = filename.split(/(\\|\/)/)
  fname = fname[fname.length - 1]
  return path.basename(filename.replace(/^[a-zA-Z]:/, '').replace(/\\/g, '/'), ext)
}

export function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

/**
 * Searches a key or value in the object, with a maximum deepness
 * @param {*} obj Search target
 * @param {string} searchTerm Search string
 * @returns {boolean} Search match
 */
export function searchDeepInObject(obj, searchTerm) {
  const seen = new Map()
  const result = internalSearchObject(obj, searchTerm.toLowerCase(), seen, 0)
  seen.clear()
  return result
}

const SEARCH_MAX_DEPTH = 10

/**
 * Executes a search on each field of the provided object
 * @param {*} obj Search target
 * @param {string} searchTerm Search string
 * @param {Map<any,boolean>} seen Map containing the search result to prevent stack overflow by walking on the same object multiple times
 * @param {number} depth Deep search depth level, which is capped to prevent performance issues
 * @returns {boolean} Search match
 */
function internalSearchObject(obj, searchTerm, seen, depth) {
  if (depth > SEARCH_MAX_DEPTH) {
    return false
  }
  let match = false
  const keys = Object.keys(obj)
  let key, value
  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    value = obj[key]
    match = internalSearchCheck(searchTerm, key, value, seen, depth + 1)
    if (match) {
      break
    }
  }
  return match
}

/**
 * Executes a search on each value of the provided array
 * @param {*} array Search target
 * @param {string} searchTerm Search string
 * @param {Map<any,boolean>} seen Map containing the search result to prevent stack overflow by walking on the same object multiple times
 * @param {number} depth Deep search depth level, which is capped to prevent performance issues
 * @returns {boolean} Search match
 */
function internalSearchArray(array, searchTerm, seen, depth) {
  if (depth > SEARCH_MAX_DEPTH) {
    return false
  }
  let match = false
  let value
  for (let i = 0; i < array.length; i++) {
    value = array[i]
    match = internalSearchCheck(searchTerm, null, value, seen, depth + 1)
    if (match) {
      break
    }
  }
  return match
}

/**
 * Checks if the provided field matches the search terms
 * @param {string} searchTerm Search string
 * @param {string} key Field key (null if from array)
 * @param {*} value Field value
 * @param {Map<any,boolean>} seen Map containing the search result to prevent stack overflow by walking on the same object multiple times
 * @param {number} depth Deep search depth level, which is capped to prevent performance issues
 * @returns {boolean} Search match
 */
function internalSearchCheck(searchTerm, key, value, seen, depth) {
  let match = false
  let result
  if (key === '_custom') {
    key = value.display
    value = value.value
  }
  ;(result = specialTokenToString(value)) && (value = result)
  if (key && compare(key, searchTerm)) {
    match = true
    seen.set(value, true)
  } else if (seen.has(value)) {
    match = seen.get(value)
  } else if (Array.isArray(value)) {
    seen.set(value, null)
    match = internalSearchArray(value, searchTerm, seen, depth)
    seen.set(value, match)
  } else if (isPlainObject(value)) {
    seen.set(value, null)
    match = internalSearchObject(value, searchTerm, seen, depth)
    seen.set(value, match)
  } else if (compare(value, searchTerm)) {
    match = true
    seen.set(value, true)
  }
  return match
}

/**
 * Compares two values
 * @param {*} value Mixed type value that will be cast to string
 * @param {string} searchTerm Search string
 * @returns {boolean} Search match
 */
function compare(value, searchTerm) {
  return ('' + value).toLowerCase().indexOf(searchTerm) !== -1
}

export function sortByKey(state) {
  return state?.slice().sort((a, b) => {
    if (a.key < b.key) return -1
    if (a.key > b.key) return 1
    return 0
  })
}

export function set(object, path, value, cb = null) {
  const sections = Array.isArray(path) ? path : path.split('.')
  while (sections.length > 1) {
    object = object[sections.shift()]
  }
  const field = sections[0]
  if (cb) {
    cb(object, field, value)
  } else {
    object[field] = value
  }
}

export function get(object, path) {
  const sections = Array.isArray(path) ? path : path.split('.')
  for (let i = 0; i < sections.length; i++) {
    object = object[sections[i]]
    if (!object) {
      return undefined
    }
  }
  return object
}

export function has(object, path, parent = false) {
  if (typeof object === 'undefined') {
    return false
  }

  const sections = Array.isArray(path) ? path : path.split('.')
  const size = !parent ? 1 : 2
  while (object && sections.length > size) {
    object = object[sections.shift()]
  }
  return object != null && object.hasOwnProperty(sections[0])
}

export function focusInput(el) {
  el.focus()
  el.setSelectionRange(0, el.value.length)
}

export function openInEditor(file) {
  // Console display
  const fileName = file.replace(/\\/g, '\\\\')
  const src = `fetch('${SharedData.openInEditorHost}__open-in-editor?file=${encodeURI(file)}').then(response => {
    if (response.ok) {
      console.log('File ${fileName} opened in editor')
    } else {
      const msg = 'Opening component ${fileName} failed'
      const target = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {}
      if (target.__VUE_DEVTOOLS_TOAST__) {
        target.__VUE_DEVTOOLS_TOAST__(msg, 'error')
      } else {
        console.log('%c' + msg, 'color:red')
      }
      console.log('Check the setup of your project, see https://github.com/vuejs/vue-devtools/blob/master/docs/open-in-editor.md')
    }
  })`
  if (isChrome) {
    chrome.devtools.inspectedWindow.eval(src)
  } else {
    // eslint-disable-next-line no-eval
    eval(src)
  }
}

const ESC = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '&': '&amp;',
}

export function escape(s) {
  return s.replace(/[<>"&]/g, escapeChar)
}

function escapeChar(a) {
  return ESC[a] || a
}

export function copyToClipboard(state) {
  if (typeof document === 'undefined') return
  const dummyTextArea = document.createElement('textarea')
  dummyTextArea.textContent = typeof state === 'string' ? state : JSON.stringify(state)
  document.body.appendChild(dummyTextArea)
  dummyTextArea.select()
  document.execCommand('copy')
  document.body.removeChild(dummyTextArea)
}

export function debug(...args) {
  if (process.env.NODE_ENV !== 'production') console.log(...args)
}
