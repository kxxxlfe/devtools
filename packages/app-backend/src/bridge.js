import { WebBridge, Plat, IFrameBridge } from '@yuhufe/browser-bridge'
import { PLATFORM, api, detectDev } from '@vue-devtools/shared-utils'

export const bridge = detectDev('backend')
  ? new IFrameBridge({ frameKey: PLATFORM.web })
  : new WebBridge({ plat: PLATFORM.web })
bridge.Plat = Plat
bridge.CHUNK_SIZE = 1024 * 1024 * 5 // 分块儿
export { api }
