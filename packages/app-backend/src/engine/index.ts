import vue2Engine from './vue2'
import vue3Engine from './vue3'

export let engine = vue2Engine
export const setEngine = function (verNum: number) {
  engine = verNum <= 2 ? vue2Engine : vue3Engine
}
