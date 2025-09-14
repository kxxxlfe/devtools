import { WebBridge, Plat, IFrameBridge } from '@yuhufe/browser-bridge'
import { PLATFORM, api, detectDev } from '@utils/api'

export const bridge = detectDev('backend')
  ? new IFrameBridge({ frameKey: PLATFORM.web })
  : new WebBridge({ plat: PLATFORM.web })
bridge.Plat = Plat
bridge.CHUNK_SIZE = 1024 * 10 // 分块儿
export { api }
