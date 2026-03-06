// API vue3
import { ComponentPublicInstance } from 'vue'
import { camelize, getCustomRefDetails } from '@utils/util'
import { capture } from './capture'

function getType(instance) {
  return instance.type || instance.proxy?.$options
}

function getInstanceName(instance) {
  const type = getType(instance)
  const name = type?.name || type?.displayName || type?.__name
  if (name) return name

  // 使用文件名
  const file = type?.__file
  if (file) {
    const filenames = file.split(/(\/|\\)/)
    const filename = filenames[filenames.length - 1]
    return filename.split('.')[0]
  }
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
  getInstanceName,
  findComponentByEl,
  capture,
  _: {
    data: instance => instance?.data || {},
    props: instance => instance.props,
    attrs: instance => instance?.attrs || instance?.proxy?.$attrs,
    refs: instance => instance?.refs || instance?.proxy?.$refs || {},
    setupState: instance => instance?.setupState || instance?.proxy?.setupState || {},
    pureData: instance => instance?.data || {},
    inject: getInject,
    route: instance => instance?.appContext?.config.globalProperties.$route,
  },
}

export default engine
