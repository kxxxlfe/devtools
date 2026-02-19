// API vue2
import { ComponentPublicInstance } from 'vue'
import { camelize, getCustomRefDetails } from '../util'

function getInstanceName(instance) {
  const proxy: ComponentPublicInstance = instance.proxy || instance
  const type = proxy.$options?.__vccOpts || proxy.$options?.type
  const name = type?.name || type?.displayName || type?.__name
  if (name) return name
  return proxy.$root === proxy ? 'Root' : 'Anonymous Component'
}

export default {
  getInstanceName,
}
