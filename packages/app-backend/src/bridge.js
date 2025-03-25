import { WebBridge, Plat } from '@yuhufe/browser-bridge'
import { PLATFORM, api } from '@utils/api'

export const bridge = new WebBridge({ plat: PLATFORM.web })
bridge.Plat = Plat
export { api }
