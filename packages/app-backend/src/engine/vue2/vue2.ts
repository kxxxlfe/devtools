// API vue2
import { camelize, getComponentName, getCustomRefDetails } from '@utils/util'
import { functional, capture } from './capture'

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

export default {
  uid: instance => instance?._uid,
  root: instance => instance?.$root,
  children: instance => instance?.$children,
  isDestroyed: instance => instance?._isBeingDestroyed,
  isFragment,
  isActive: instance => !instance?._inactive,
  getInstanceName,
  findComponentByEl,
  functional,
  capture,
}
