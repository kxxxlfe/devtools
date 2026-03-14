// API vue3
import { ComponentPublicInstance } from 'vue'
import { classify, basename } from '@utils/util'
import { capture } from './capture'

function getType(instance) {
  return instance.type || instance.proxy?.$options
}

function getOptionName(type) {
  const { name, displayName, __name, __file } = type
  const instName = name || displayName || __name
  if (instName) {
    return instName
  }

  if (__file) {
    return classify(basename(__file, '.vue'))
  }

  return ''
}

// vue3有2种instance：vue3的instance；兼容vue2的proxy
function getInstance(instance) {
  if (instance?.$?.vnode) {
    return instance?.$
  }
  return instance
}

function getInstanceName(instance) {
  instance = getInstance(instance)
  const type = getType(instance)
  const name = getOptionName(type || {})
  if (name) return name

  return instance.root === instance ? 'Root' : 'Anonymous Component'
}

// 根据el获取component
function findComponentByEl(el) {
  return el?.__vueParentComponent
}

const tranverseVNodes = function (instance, callback: (vnode) => any) {
  const vnode = instance.subTree

  const tranverse = function (vnode) {
    if (!vnode || typeof vnode !== 'object') {
      return
    }
    if (callback(vnode) === false) {
      return
    }
    if (Array.isArray(vnode.children)) {
      vnode.children.forEach(item => {
        tranverse(item)
      })
    }
  }

  tranverse(vnode)
}

export function isFragment(instance) {
  return instance.subTree?.type === Symbol.for('v-fgt')
}

function getInject(instance) {
  const injected = instance.type?.inject

  if (injected) {
    const keys = Array.isArray(injected) ? injected : Object.keys(injected)
    return Object.fromEntries(keys.map(key => [key, instance?.ctx?.[key]]))
  }
  return {}
}

const engine = {
  uid: instance => instance?.uid,
  root: instance => instance?.root,
  children: instance => {
    const list = []
    tranverseVNodes(instance, function (vnode) {
      // 找到组件，停止向下遍历
      if (vnode.component) {
        list.push(vnode.component)
        return false
      }
    })

    return list
  },
  file: instance => getType(instance)?.__file || null,
  isDestroyed: instance => instance?.isUnmounted,
  isFragment,
  isActive: instance => !instance?.isDeactivated,
  isComponentInstance: instance => instance?.emit && instance?.vnode,
  isProxyCompInstance: instance => engine.isComponentInstance(instance?.$),
  isVNode: instance => {
    if (!instance) {
      return false
    }
    return ['el', 'component', '__v_isVNode'].every(k => Reflect.has(instance, k))
  },
  getInstanceName,
  getOptionName,
  findComponentByEl,
  capture,
  _: {
    el: instance => instance?.subTree?.el,
    data: instance => instance?.data || {},
    props: instance => instance.props,
    attrs: instance => instance?.attrs || instance?.proxy?.$attrs,
    refs: instance => instance?.refs || instance?.proxy?.$refs || {},
    setupState: instance => instance?.setupState || instance?.proxy?.setupState || {},
    pureData: instance => instance?.data || {},
    inject: getInject,
    route: instance => instance?.appContext?.config.globalProperties.$route,
    pinia: instance => instance?.appContext?.config.globalProperties.$pinia,
  },
  getMuteAPI(instance) {
    return {
      $set(obj, field, value) {
        obj[field] = value
      },
      $delete(obj, field) {
        Reflect.deleteProperty(obj, field)
      },
    }
  }
}

export default engine
