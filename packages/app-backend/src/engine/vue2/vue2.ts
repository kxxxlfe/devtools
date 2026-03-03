// API vue2
import { camelize, getComponentName, getCustomRefDetails } from '@utils/util'
import { functional, capture } from './capture'
import { getHook } from '../../utils'

function getInstanceName(instance) {
  const name = getComponentName(instance.$options || instance.fnOptions || {})
  if (name) return name
  return instance.$root === instance ? 'Root' : 'Anonymous Component'
}

// 根据el获取component
function findComponentByEl(el) {
  while (!el.__vue__ && el.parentElement) {
    el = el.parentElement
  }
  return el?.__vue__
}

export function isFragment(instance) {
  return instance?._isFragment
}

// 获取属性
const getData = function (instance) {
  // 排除了同名的属性，剩下的就是data
  const props = getHook().env.verNum === 1 ? instance._props : instance.$options?.props
  const getters = instance.$options?.vuex?.getters
  return Object.fromEntries(
    Object.entries(instance._data).filter(([key, data]) => {
      return !(props && key in props) && !(getters && key in getters)
    })
  )
}

function getSetupState(instance) {
  return instance?._setupState || {}
}

export default {
  uid: instance => instance?._uid,
  root: instance => instance?.$root,
  children: instance => instance?.$children,
  file: instance => instance?.$vnode?.componentOptions?.Ctor?.options?.__file || null,
  isDestroyed: instance => instance?._isBeingDestroyed,
  isFragment,
  isActive: instance => !instance?._inactive,
  getInstanceName,
  findComponentByEl,
  functional,
  capture,
  _: {
    data: getData,
    refs: instance => instance?.$refs || {},
    setupState: getSetupState,
  },
}
