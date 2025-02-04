// This is the backend that is injected into the page that a Vue app lives in
// when the Vue Devtools panel is activated.
import { isRef } from 'vue'
import { highlight, unHighlight, getInstanceOrVnodeRect } from './highlighter'
import { initVuexBackend } from './vuex'
import { initEventsBackend } from './events'
import { initRouterBackend } from './router'
import { initPerfBackend } from './perf'
import { initPiniaBackend } from './pinia'
import { findRelatedComponent, debounce } from './utils'
import ComponentSelector from './component-selector'
import { getInstanceState, getInstanceName } from './process'
import { stringify, classify, camelize, set, has, parse, getComponentName, setInstanceMap, kebabize } from '@utils/util'
import SharedData, { init as initSharedData } from '@utils/shared-data'
import { isBrowser, target } from '@utils/env'
import { bridge as exBridge } from '@utils/ext-bridge/web'

// hook should have been injected before this executes.
const hook = target.__VUE_DEVTOOLS_GLOBAL_HOOK__
const rootInstances = []

export const instanceMap = (target.__VUE_DEVTOOLS_INSTANCE_MAP__ = new Map())
setInstanceMap(instanceMap)
export const functionalVnodeMap = (target.__VUE_DEVTOOLS_FUNCTIONAL_VNODE_MAP__ = new Map())

const consoleBoundInstances = Array(5)
let currentInspectedId
let bridge
let filter = ''
let captureCount = 0
let isLegacy = false
let rootUID = 0
let functionalIds = new Map()

// Dedupe instances
// Some instances may be both on a component and on a child abstract/functional component
const captureIds = new Map()

export function initBackend(_bridge) {
  bridge = _bridge

  if (hook.Vue) {
    isLegacy = hook.Vue.version && hook.Vue.version.split('.')[0] === '1'
    connect(hook.Vue)
  } else {
    hook.once('init', connect)
  }

  initRightClick()
}

function connect(Vue) {
  initSharedData({
    bridge,
    exBridge,
    Vue,
  }).then(() => {
    hook.currentTab = 'components'
    bridge.on('switch-tab', tab => {
      hook.currentTab = tab
    })

    // the backend may get injected to the same page multiple times
    // if the user closes and reopens the devtools.
    // make sure there's only one flush listener.
    hook.off('flush')
    hook.on('flush', () => {
      if (hook.currentTab === 'components') {
        debounceFlush()
      }
    })

    // eslint-disable-next-line no-new
    new ComponentSelector(bridge, instanceMap)

    // Get the instance id that is targeted by context menu
    bridge.on('get-context-menu-target', () => {
      const instance = target.__VUE_DEVTOOLS_CONTEXT_MENU_TARGET__

      target.__VUE_DEVTOOLS_CONTEXT_MENU_TARGET__ = null
      target.__VUE_DEVTOOLS_CONTEXT_MENU_HAS_TARGET__ = false

      if (instance) {
        inspectInstance(instance)
      }

      toast('No Vue component was found', 'warn')
    })

    // vuex
    if (hook.store) {
      initVuexBackend(hook, bridge, hook.store.commit === undefined)
    } else {
      hook.once('vuex:init', store => {
        initVuexBackend(hook, bridge, store.commit === undefined)
      })
    }

    hook.once('router:init', () => {
      initRouterBackend(hook.Vue, bridge, rootInstances)
    })

    // events
    initEventsBackend(Vue, bridge)

    // User project devtools config
    if (target.hasOwnProperty('VUE_DEVTOOLS_CONFIG')) {
      const config = target.VUE_DEVTOOLS_CONFIG

      // Open in editor
      if (config.hasOwnProperty('openInEditorHost')) {
        SharedData.openInEditorHost = config.openInEditorHost
      }
    }

    bridge.log('backend ready.')
    bridge.send('ready', Vue.version)
    bridge.on('log-detected-vue', () => {
      console.log(
        `%c vue-devtools %c Detected Vue v${Vue.version} %c`,
        'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
        'background:#41b883 ; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
        'background:transparent'
      )
    })

    setTimeout(() => {
      scan()

      // pinia
      initPiniaBackend(Vue, rootInstances)

      // perf
      initPerfBackend(Vue, bridge, instanceMap)
    }, 0)
  })
}

export function findInstanceOrVnode(id) {
  if (/:functional:/.test(id)) {
    const [refId] = id.split(':functional:')
    const map = functionalVnodeMap.get(refId)
    return map && map[id]
  }
  return instanceMap.get(id)
}

/**
 * Scan the page for root level Vue instances.
 */

function scan() {
  rootInstances.length = 0
  let inFragment = false
  let currentFragment = null

  function processInstance(instance) {
    if (instance) {
      if (rootInstances.indexOf(instance.$root) === -1) {
        instance = instance.$root
      }
      if (instance._isFragment) {
        inFragment = true
        currentFragment = instance
      }

      // respect Vue.config.devtools option
      let baseVue = instance.constructor
      while (baseVue.super) {
        baseVue = baseVue.super
      }
      if (baseVue.config && baseVue.config.devtools) {
        // give a unique id to root instance so we can
        // 'namespace' its children
        if (typeof instance.__VUE_DEVTOOLS_ROOT_UID__ === 'undefined') {
          instance.__VUE_DEVTOOLS_ROOT_UID__ = ++rootUID
        }
        rootInstances.push(instance)
      }

      return true
    }
  }

  if (isBrowser) {
    walk(document, function (node) {
      if (inFragment) {
        if (node === currentFragment._fragmentEnd) {
          inFragment = false
          currentFragment = null
        }
        return true
      }
      let instance = node.__vue__

      return processInstance(instance)
    })
  } else {
    if (Array.isArray(target.__VUE_ROOT_INSTANCES__)) {
      target.__VUE_ROOT_INSTANCES__.map(processInstance)
    }
  }

  hook.emit('router:init')
  flush()
}

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
 * Called on every Vue.js batcher flush cycle.
 * Capture current component tree structure and the state
 * of the current inspected instance (if present) and
 * send it to the devtools.
 */

function flush() {
  let start
  functionalIds.clear()
  captureIds.clear()
  if (process.env.NODE_ENV !== 'production') {
    captureCount = 0
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

  exBridge.send(`${exBridge.Plat.devtool}/update-instance`, {
    id: currentInspectedId,
    instance: stringify(getInstanceDetails(currentInspectedId)),
  })
  exBridge.send(`${exBridge.Plat.devtool}/flush`, payload)
}

const debounceFlush = debounce(flush, 200)

/**
 * Iterate through an array of instances and flatten it into
 * an array of qualified instances. This is a depth-first
 * traversal - e.g. if an instance is not matched, we will
 * recursively go deeper until a qualified child is found.
 *
 * @param {Array} instances
 * @return {Array}
 */

function findQualifiedChildrenFromList(instances) {
  instances = instances.filter(child => !child._isBeingDestroyed)
  return !filter ? instances.map(capture) : Array.prototype.concat.apply([], instances.map(findQualifiedChildren))
}

/**
 * Find qualified children from a single instance.
 * If the instance itself is qualified, just return itself.
 * This is ok because [].concat works in both cases.
 *
 * @param {Vue|Vnode} instance
 * @return {Vue|Array}
 */

function findQualifiedChildren(instance) {
  return isQualified(instance)
    ? capture(instance)
    : findQualifiedChildrenFromList(instance.$children).concat(
        instance._vnode && instance._vnode.children
          ? // Find functional components in recursively in non-functional vnodes.
            flatten(instance._vnode.children.filter(child => !child.componentInstance).map(captureChild))
              // Filter qualified children.
              .filter(instance => isQualified(instance))
          : []
      )
}

/**
 * Check if an instance is qualified.
 *
 * @param {Vue|Vnode} instance
 * @return {Boolean}
 */

function isQualified(instance) {
  const name = classify(instance.name || getInstanceName(instance)).toLowerCase()
  return name.indexOf(filter) > -1
}

function flatten(items) {
  return items.reduce((acc, item) => {
    if (item instanceof Array) acc.push(...flatten(item))
    else if (item) acc.push(item)

    return acc
  }, [])
}

function captureChild(child) {
  if (child.fnContext && !child.componentInstance) {
    return capture(child)
  } else if (child.componentInstance) {
    if (!child.componentInstance._isBeingDestroyed) return capture(child.componentInstance)
  } else if (child.children) {
    return flatten(child.children.map(captureChild))
  }
}

/**
 * Capture the meta information of an instance. (recursive)
 *
 * @param {Vue} instance
 * @return {Object}
 */

function capture(instance, index, list) {
  if (process.env.NODE_ENV !== 'production') {
    captureCount++
  }

  if (instance.$options && instance.$options.abstract && instance._vnode && instance._vnode.componentInstance) {
    instance = instance._vnode.componentInstance
  }

  // Functional component.
  if (instance.fnContext && !instance.componentInstance) {
    const contextUid = instance.fnContext.__VUE_DEVTOOLS_UID__
    let id = functionalIds.get(contextUid)
    if (id == null) {
      id = 0
    } else {
      id++
    }
    functionalIds.set(contextUid, id)
    const functionalId = contextUid + ':functional:' + id
    markFunctional(functionalId, instance)
    return {
      id: functionalId,
      functional: true,
      name: getInstanceName(instance),
      renderKey: getRenderKey(instance.key),
      children: (instance.children
        ? instance.children.map(child =>
            child.fnContext
              ? captureChild(child)
              : child.componentInstance
              ? capture(child.componentInstance)
              : undefined
          )
        : // router-view has both fnContext and componentInstance on vnode.
        instance.componentInstance
        ? [capture(instance.componentInstance)]
        : []
      ).filter(Boolean),
      inactive: false,
      isFragment: false, // TODO: Check what is it for.
    }
  }
  // instance._uid is not reliable in devtools as there
  // may be 2 roots with same _uid which causes unexpected
  // behaviour
  instance.__VUE_DEVTOOLS_UID__ = getUniqueId(instance)

  // Dedupe
  if (captureIds.has(instance.__VUE_DEVTOOLS_UID__)) {
    return
  } else {
    captureIds.set(instance.__VUE_DEVTOOLS_UID__, undefined)
  }

  mark(instance)
  const name = getInstanceName(instance)

  const ret = {
    uid: instance._uid,
    id: instance.__VUE_DEVTOOLS_UID__,
    name,
    renderKey: getRenderKey(instance.$vnode ? instance.$vnode['key'] : null),
    inactive: !!instance._inactive,
    isFragment: !!instance._isFragment,
    children: instance.$children
      .filter(child => !child._isBeingDestroyed)
      .map(capture)
      .filter(Boolean),
  }

  if (instance._vnode && instance._vnode.children) {
    ret.children = ret.children.concat(flatten(instance._vnode.children.map(captureChild)).filter(Boolean))
  }

  // record screen position to ensure correct ordering
  if ((!list || list.length > 1) && !instance._inactive) {
    const rect = getInstanceOrVnodeRect(instance)
    ret.top = rect ? rect.top : Infinity
  } else {
    ret.top = Infinity
  }
  // check if instance is available in console
  const consoleId = consoleBoundInstances.indexOf(instance.__VUE_DEVTOOLS_UID__)
  ret.consoleId = consoleId > -1 ? '$vm' + consoleId : null
  // check router view
  const isRouterView2 = instance.$vnode && instance.$vnode.data.routerView
  if (instance._routerView || isRouterView2) {
    ret.isRouterView = true
    if (!instance._inactive && instance.$route) {
      const matched = instance.$route.matched
      const depth = isRouterView2 ? instance.$vnode.data.routerViewDepth : instance._routerView.depth
      ret.matchedRouteSegment =
        matched && matched[depth] && (isRouterView2 ? matched[depth].path : matched[depth].handler.path)
    }
  }
  return ret
}

/**
 * Mark an instance as captured and store it in the instance map.
 *
 * @param {Vue} instance
 */

function mark(instance) {
  if (!instanceMap.has(instance.__VUE_DEVTOOLS_UID__)) {
    instanceMap.set(instance.__VUE_DEVTOOLS_UID__, instance)
    instance.$on('hook:beforeDestroy', function () {
      instanceMap.delete(instance.__VUE_DEVTOOLS_UID__)
    })
  }
}

function markFunctional(id, vnode) {
  const refId = vnode.fnContext.__VUE_DEVTOOLS_UID__
  if (!functionalVnodeMap.has(refId)) {
    functionalVnodeMap.set(refId, {})
    vnode.fnContext.$on('hook:beforeDestroy', function () {
      functionalVnodeMap.delete(refId)
    })
  }

  functionalVnodeMap.get(refId)[id] = vnode
}

/**
 * Get the detailed information of an inspected instance.
 *
 * @param {Number} id
 */

function getInstanceDetails(id) {
  const instance = instanceMap.get(id)
  if (!instance) {
    const vnode = findInstanceOrVnode(id)

    if (!vnode) return {}

    const data = {
      id,
      name: getComponentName(vnode.fnOptions),
      file: vnode.fnOptions.__file || null,
      state: processProps({
        $options: vnode.fnOptions,
        ...(vnode.devtoolsMeta && vnode.devtoolsMeta.renderContext.props),
      }),
      functional: true,
    }

    return data
  } else {
    const data = {
      id: id,
      name: getInstanceName(instance),
      state: getInstanceState(instance),
    }

    let i
    if ((i = instance.$vnode) && (i = i.componentOptions) && (i = i.Ctor) && (i = i.options)) {
      data.file = i.__file || null
    }

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
  window.$vm = instance
}

/**
 * Returns a devtools unique id for instance.
 * @param {Vue} instance
 */
function getUniqueId(instance) {
  const rootVueId = instance.$root.__VUE_DEVTOOLS_ROOT_UID__
  return `${rootVueId}:${instance._uid}`
}

function getRenderKey(value) {
  if (value == null) return
  const type = typeof value
  if (type === 'number') {
    return value
  } else if (type === 'string') {
    return `'${value}'`
  } else if (Array.isArray(value)) {
    return 'Array'
  } else {
    return 'Object'
  }
}

/**
 * Display a toast message.
 * @param {any} message HTML content
 */
export function toast(message, type = 'normal') {
  const fn = target.__VUE_DEVTOOLS_TOAST__
  fn && fn(message, type)
}

function inspectInstance(instance) {
  const id = instance.__VUE_DEVTOOLS_UID__
  id && exBridge.send(`${exBridge.Plat.devtool}/inspect-instance`, id)
}
target.__VUE_DEVTOOLS_INSPECT__ = inspectInstance

function initRightClick() {
  if (!isBrowser) return
  // Start recording context menu when Vue is detected
  // event if Vue devtools are not loaded yet
  document.addEventListener('contextmenu', event => {
    const el = event.target
    if (el) {
      // Search for parent that "is" a component instance
      const instance = findRelatedComponent(el)
      if (instance) {
        window.__VUE_DEVTOOLS_CONTEXT_MENU_HAS_TARGET__ = true
        window.__VUE_DEVTOOLS_CONTEXT_MENU_TARGET__ = instance
        return
      }
    }
    window.__VUE_DEVTOOLS_CONTEXT_MENU_HAS_TARGET__ = null
    window.__VUE_DEVTOOLS_CONTEXT_MENU_TARGET__ = null
  })
}

// exBridge
exBridge.on(`${exBridge.Plat.web}/enter-instance`, id => {
  const instance = findInstanceOrVnode(id)
  if (instance) highlight(instance)
})
exBridge.on(`${exBridge.Plat.web}/leave-instance`, id => {
  unHighlight(id)
})
exBridge.on(`${exBridge.Plat.web}/select-instance`, id => {
  currentInspectedId = id
  const instance = findInstanceOrVnode(id)
  if (!instance) return
  if (!/:functional:/.test(id)) bindToConsole(instance)
})
exBridge.on(`${exBridge.Plat.web}/flush`, () => {
  debounceFlush()
})
// instance的fetch
exBridge.on(`${exBridge.Plat.web}/fetch-instance`, id => {
  const instStr = stringify(getInstanceDetails(id))
  return instStr
})
exBridge.on(`${exBridge.Plat.web}/refresh`, scan)

/**
 * Sroll a node into view.
 *
 * @param {Vue} instance
 */

function scrollIntoView(instance) {
  const rect = getInstanceOrVnodeRect(instance)
  if (rect) {
    // TODO: Handle this for non-browser environments.
    window.scrollBy(0, rect.top + (rect.height - window.innerHeight) / 2)
  }
}
exBridge.on(`${exBridge.Plat.web}/scroll-to-instance`, id => {
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
    const api = isLegacy
      ? {
          $set: hook.Vue.set,
          $delete: hook.Vue.delete,
        }
      : instance

    let data
    const paths = path.split('.')
    // 支持setup
    if (instance._setupState?.[paths[0]]) {
      data = instance._setupState[paths[0]]
      // 替换根元素
      if (paths.length === 1) {
        data.value = parsedValue
        return
      }
      data = data.value
      path = paths.slice(1).join('.')
    } else if (has(instance._props, path, newKey)) {
      data = instance._props
    } else {
      data = instance._data
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
exBridge.on(`${exBridge.Plat.web}/set-instance-data`, args => {
  setStateValue(args)
  debounceFlush()
})
exBridge.on(`${exBridge.Plat.web}/filter-instances`, _filter => {
  filter = _filter.toLowerCase()
  debounceFlush()
})
