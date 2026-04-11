// This is the backend that is injected into the page that a Vue app lives in
// when the Vue Devtools panel is activated.
import { envs } from '@vue-devtools/shared-utils'
import { highlight, unHighlight } from './highlighter'
import { initVuexBackend } from './vuex'
import { initEventsBackend } from './events'
import { initRouterBackend } from './router'
import { initPerfBackend } from './perf'
import { initPiniaBackend } from './pinia'
import { debounce, getInstanceState, getHook, stringify, setFilter } from './utils'
import {
  instanceMap,
  consoleBoundInstances,
  getNextRootUID,
  clearFlushState,
  findQualifiedChildrenFromList,
  captureCount,
} from './utils/flush'

import { classify, parse, set, has } from '@utils/util'
import ComponentSelector from './component-selector'
import SharedData, { init as initSharedData } from '@utils/shared-data'
import { whenDevtoolActive } from '@utils/devpage'
import { isBrowser, target } from '@utils/env'
import { bridge as exBridge, api } from './bridge'
import { inspectInstance } from './op'
import { initRightClick } from './contextmenu'
import { engine, setEngine } from './engine'

// hook should have been injected before this executes.
const hook = getHook()
const rootInstances = []

// 插入backend脚本，防止多次插入
hook.injectBackend = async function () {
  setTimeout(() => {
    // 再次inject时，直接初始化
    connect()
  }, 0)

  return true
}
// 提供inspect需要的dom
hook.getElById = function (id) {
  const instance = findInstanceOrVnode(id)
  return engine._.el(instance)
}

let currentInspectedId
let bridge

export function initBackend(_bridge) {
  bridge = _bridge

  if (hook.env) {
    connect()
  } else {
    // vue2
    hook.once('init', Vue => {
      hook.env = hook.env || envs.vue2.makeEnv(Vue)
      connect()
    })
    // vue3
    hook.once('app:init', (app, version, params) => {
      hook.env = hook.env || envs.vue3.makeEnv(app)
      connect()
    })
    // vue2 + 3
    hook.once('horse:init', connect)
  }

  // 选中组件
  new ComponentSelector()

  initRightClick()
}

function connect() {
  const { Vue, version, verNum } = hook.env
  setEngine(verNum) // 根据版本设置不同engine
  initSharedData({
    exBridge,
  }).then(() => {
    hook.currentTab = 'components'

    // the backend may get injected to the same page multiple times
    // if the user closes and reopens the devtools.
    // make sure there's only one flush listener.
    engine.initHook(hook, { debounceFlush })

    // vuex
    if (hook.store) {
      initVuexBackend(hook, bridge, hook.store.commit === undefined)
    } else {
      hook.once('vuex:init', store => {
        initVuexBackend(hook, bridge, store.commit === undefined)
      })
    }

    // events
    Vue && initEventsBackend(Vue)

    // User project devtools config
    if (target.hasOwnProperty('VUE_DEVTOOLS_CONFIG')) {
      const config = target.VUE_DEVTOOLS_CONFIG

      // Open in editor
      if (config.hasOwnProperty('openInEditorHost')) {
        SharedData.openInEditorHost = config.openInEditorHost
      }
    }

    bridge.send('ready', version)

    setTimeout(() => {
      scan()

      // pinia
      initPiniaBackend(rootInstances)

      // perf
      Vue && initPerfBackend(Vue)

      // router
      initRouterBackend(rootInstances)
    }, 0)
  })
}

export function findInstanceOrVnode(id) {
  const functionalInst = engine.functional?.findInstanceOrVnode(id)
  if (functionalInst) {
    return functionalInst
  }
  return instanceMap.get(id)
}

/**
 * Scan the page for root level Vue instances.
 */

function scan() {
  rootInstances.length = 0
  const scanInstMap = new Map()

  function processInstance(instance) {
    if (!instance) {
      return
    }
    if (scanInstMap.get(instance)) {
      return true
    }
    scanInstMap.set(instance, true)
    const rootInst = engine.root(instance)
    if (rootInstances.indexOf(rootInst) === -1) {
      instance = rootInst
    }

    // respect Vue.config.devtools option
    if (hook.env?.devtoolsEnabled) {
      // give a unique id to root instance so we can
      // 'namespace' its children
      if (typeof instance.__VUE_DEVTOOLS_ROOT_UID__ === 'undefined') {
        instance.__VUE_DEVTOOLS_ROOT_UID__ = getNextRootUID()
      }
      rootInstances.push(instance)
    }

    return true
  }

  if (isBrowser) {
    walk(document, function (node) {
      let instance = engine.findComponentByEl(node)

      return processInstance(instance)
    })
  } else {
    if (Array.isArray(target.__VUE_ROOT_INSTANCES__)) {
      target.__VUE_ROOT_INSTANCES__.map(processInstance)
    }
  }

  flush()
}

/**
 * Called on every Vue.js batcher flush cycle.
 * Capture current component tree structure and the state
 * of the current inspected instance (if present) and
 * send it to the devtools.
 */
function flush() {
  let start
  clearFlushState()
  if (process.env.NODE_ENV !== 'production') {
    start = isBrowser ? window.performance.now() : 0
  }
  const payload = stringify({
    instances: findQualifiedChildrenFromList(rootInstances).filter(item => !!item),
  })
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[flush] serialized ${captureCount} instances${isBrowser ? `, took ${window.performance.now() - start}ms.` : ''}.`
    )
  }
  exBridge.send(api.devtool.updateInstance, {
    id: currentInspectedId,
    instance: stringify(getInstanceDetails(currentInspectedId)),
  })
  exBridge.send(api.devtool.flush, payload, { chunk: { size: 1024 * 10 } })
}

const debounceFlush = debounce(() => {
  whenDevtoolActive(flush)
}, 200)

/**
 * DOM walk helper
 *
 * @param {NodeList} nodes
 * @param {Function} fn
 */

function walk(node, fn) {
  if (node.childNodes) {
    for (let i = 0, l = node.childNodes.length; i < l; i++) {
      const child = node.childNodes[i]
      const stop = fn(child)
      if (!stop) {
        walk(child, fn)
      }
    }
  }

  // also walk shadow DOM
  if (node.shadowRoot) {
    walk(node.shadowRoot, fn)
  }
}

/**
 * Get the detailed information of an inspected instance.
 *
 * @param {Number} id
 */

function getInstanceDetails(id) {
  const instance = instanceMap.get(id)
  // vue2
  if (!instance) {
    return engine.functional?.getTreeData(id)
  } else {
    const data: any = {
      id: id,
      name: engine.getInstanceName(instance),
      state: getInstanceState(instance),
    }

    data.file = engine.file(instance)

    return data
  }
}

/**
 * Binds given instance in console as $vm0.
 * For compatibility reasons it also binds it as $vm.
 *
 * @param {Vue} instance
 */

function bindToConsole(instance) {
  if (!instance) return
  if (!isBrowser) return

  const id = instance.__VUE_DEVTOOLS_UID__
  const index = consoleBoundInstances.indexOf(id)
  if (index > -1) {
    consoleBoundInstances.splice(index, 1)
  } else {
    consoleBoundInstances.pop()
  }

  consoleBoundInstances.unshift(id)
  for (let i = 0; i < 5; i++) {
    window['$vm' + i] = instanceMap.get(consoleBoundInstances[i])
  }
  window['$vm'] = instance
}

/**
 * Display a toast message.
 * @param {any} message HTML content
 */
export function toast(message, type = 'normal') {
  const fn = target.__VUE_DEVTOOLS_TOAST__
  fn && fn(message, type)
}

target.__VUE_DEVTOOLS_INSPECT__ = inspectInstance

// exBridge
exBridge.on(api.web.enterInstance, id => {
  const instance = findInstanceOrVnode(id)
  if (instance) highlight(instance)
})
exBridge.on(api.web.leaveInstance, id => {
  unHighlight(id)
})
exBridge.on(api.web.selectInstance, id => {
  currentInspectedId = id
  const instance = findInstanceOrVnode(id)
  if (!instance) return
  if (!/:functional:/.test(id)) bindToConsole(instance)
})
exBridge.on(api.web.flush, () => {
  debounceFlush()
})
// instance的fetch
exBridge.on(api.web.fetchInstance, id => {
  const instStr = stringify(getInstanceDetails(id))
  return instStr
})
exBridge.on(api.web.refresh, scan)

/**
 * Sroll a node into view.
 *
 * @param {Vue} instance
 */

function scrollIntoView(instance) {
  const rect = engine.getInstanceOrVnodeRect(instance)
  if (rect) {
    // TODO: Handle this for non-browser environments.
    window.scrollBy(0, rect.top + (rect.height - window.innerHeight) / 2)
  }
}
exBridge.on(api.web.scrollToInstance, id => {
  const instance = findInstanceOrVnode(id)
  if (instance) {
    scrollIntoView(instance)
    highlight(instance)
  }
})

function setStateValue({ id, path, value, newKey, remove }) {
  const instance = instanceMap.get(id)
  if (!instance) {
    return
  }

  try {
    let parsedValue
    if (value) {
      parsedValue = parse(value, true)
    }
    const api = engine.getMuteAPI(instance)

    let data
    const paths = path.split('.')
    // 支持setup
    data = engine._.setupState(instance)?.[paths[0]]
    const props = engine._.props(instance)
    if (data) {
      // 替换根元素
      if (paths.length === 1) {
        data.value = parsedValue
        return
      }
      data = data.value
      path = paths.slice(1).join('.')
    } else if (has(props, path, newKey)) {
      data = props
    } else {
      data = engine._.data(instance)
    }
    set(data, path, parsedValue, (obj, field, value) => {
      if (remove || newKey) {
        api.$delete(obj, field)
      }
      if (!remove) {
        api.$set(obj, newKey || field, value)
      }
    })
  } catch (e) {
    console.error(e)
  }
}
exBridge.on(api.web.setInstanceData, args => {
  setStateValue(args)
  debounceFlush()
})
exBridge.on(api.web.filterInstance, _filter => {
  setFilter(_filter.toLowerCase())
  debounceFlush()
})
// 更新当前devtools正在使用的功能
exBridge.on(api.web.updateActiveTab, tab => {
  hook.currentTab = tab
})
// print vue info
exBridge.on(api.web.log, ({ type }: any = {}) => {
  if (type === 'log-detected-vue') {
    console.log(
      `%c vue-devtools %c Detected Vue v${hook.env?.version} %c`,
      'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
      'background:#41b883 ; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
      'background:transparent'
    )
  }
})
