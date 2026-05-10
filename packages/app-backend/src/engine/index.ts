import vue2Engine from './vue2'
import vue3Engine from './vue3'
import { VueEngine } from './types'

export let engine: VueEngine = vue2Engine
export const setEngine = function (verNum: number) {
  if (verNum > 2) {
    engine = vue3Engine
  }
}
// vue2 & 3混合开发时，需要动态的engine
export const getEngine = function (instance) {
  return instance?.appContext?.app ? vue3Engine : vue2Engine
}
