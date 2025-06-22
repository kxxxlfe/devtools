import { bridge as exBridge, api } from './bridge'
import { findRelatedInstanceId } from './utils'

// 常见操作
// 定位到component
export function inspectInstance(instance) {
  const id = findRelatedInstanceId(instance)

  if (id) {
    exBridge.send(api.devtool.inspectInstance, id)
  }
}
