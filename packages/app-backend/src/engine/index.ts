import vue2Engine from './vue2'
import vue3Engine from './vue3'
import { VueEngine } from './types'

export let engine: VueEngine = vue2Engine
export const setEngine = function (verNum: number) {
  engine = verNum <= 2 ? vue2Engine : vue3Engine
}
