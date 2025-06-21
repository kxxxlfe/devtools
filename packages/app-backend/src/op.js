import { bridge as exBridge, api } from './bridge'

// 常见操作
// 定位到component
export function inspectInstance(instance) {
  let id = null
  do {
    id = instance.__VUE_DEVTOOLS_UID__
    if (id) {
      break
    }
    instance = instance.$parent
  } while (instance)

  if (id) {
    exBridge.send(api.devtool.inspectInstance, id)
  }
}
