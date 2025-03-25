import { Plat } from '@yuhufe/browser-bridge'

export const PLATFORM = {
  web: 'vueDevtoolsWeb',
  devtool: Plat.devtool,
}

export const api = {
  web: {
    flush: `${PLATFORM.web}/flush`,
  },
  devtool: {
    flush: `${PLATFORM.devtool}/flush`,
    updateInstance: `${PLATFORM.devtool}/update-instance`,
    inspectInstance: `${PLATFORM.devtool}/inspect-instance`,
  },
}
