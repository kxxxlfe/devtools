// API vue3
import { ComponentPublicInstance } from 'vue'
import { camelize, getCustomRefDetails } from '@utils/util'
import { capture } from './capture'

function getInstanceName(instance) {
  const proxy: ComponentPublicInstance = instance.proxy || instance
  const type = proxy.$options?.__vccOpts || proxy.$options?.type
  const name = type?.name || type?.displayName || type?.__name
  if (name) return name
  return proxy.$root === proxy ? 'Root' : 'Anonymous Component'
}

// 根据el获取component
function findComponentByEl(el) {
  return el?.__vueParentComponent
}

export function isFragment(instance) {
  return instance.subTree?.type === Symbol.for('v-fgt')
}

const engine = {
  uid: instance => instance?.uid,
  root: instance => instance?.root,
  children: instance =>
    instance?.subTree?.children?.map((item: any) => item.component).filter((item: any) => !!item) || [],
  isDestroyed: instance => instance?.isUnmounted,
  isFragment,
  isActive: instance => !instance?.isDeactivated,
  getInstanceName,
  findComponentByEl,
  capture,
}

export default engine
