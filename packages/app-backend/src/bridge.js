import { WebBridge, Plat, IFrameBridge } from '@yuhufe/browser-bridge'
import { PLATFORM, api } from '@utils/api'

export const bridge = window.isShellDev
  ? new IFrameBridge({ frameKey: PLATFORM.web })
  : new WebBridge({ plat: PLATFORM.web })
bridge.Plat = Plat
export { api }
