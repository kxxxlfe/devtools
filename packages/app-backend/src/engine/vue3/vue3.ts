// API vue3
import { ComponentPublicInstance } from 'vue'
import { camelize, getCustomRefDetails } from '@utils/util'
import { capture } from './capture'

function getInstanceName(instance) {
  const type = instance.type || instance.proxy?.$options
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

export function isFragment(instance) {
  return instance.subTree?.type === Symbol.for('v-fgt')
}

const engine = {
  uid: instance => instance?.uid,
  root: instance => instance?.root,
  children: instance => {
    if (instance?.subTree?.children) {
      return instance?.subTree?.children?.map(item => item.component).filter(item => !!item) || []
    }
    if (instance?.subTree?.component) {
      return [instance?.subTree?.component]
    }

    return []
  },
  isDestroyed: instance => instance?.isUnmounted,
  isFragment,
  isActive: instance => !instance?.isDeactivated,
  getInstanceName,
  findComponentByEl,
  capture,
}

export default engine
