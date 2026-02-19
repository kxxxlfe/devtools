// API vue2
import { camelize, getComponentName, getCustomRefDetails } from '../util'

function getInstanceName(instance) {
  const name = getComponentName(instance.$options || instance.fnOptions || {})
  if (name) return name
  return instance.$root === instance ? 'Root' : 'Anonymous Component'
}

export default {
  getInstanceName,
}
