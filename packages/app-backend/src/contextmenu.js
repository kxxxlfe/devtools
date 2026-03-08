import { isBrowser, target } from '@utils/env'
import { bridge as exBridge, api } from './bridge'
import { findRelatedInstanceId } from './utils'
import { engine } from './engine'

let ctxEl = null

// Get the instance id that is targeted by context menu
exBridge.on(api.web.inspectCtxMenuInst, () => {
  if (!ctxEl) {
    return null
  }

  // Search for parent that "is" a component instance
  const instance = engine.findComponentByEl(ctxEl)
  target.__VUE_DEVTOOLS_CONTEXT_MENU_TARGET__ = instance
  const relatedInstanceId = findRelatedInstanceId(instance)
  if (!relatedInstanceId) {
    toast('No Vue component was found', 'warn')
    return null
  }

  return relatedInstanceId
})

export function initRightClick() {
  if (!isBrowser) return
  // Start recording context menu when Vue is detected
  // event if Vue devtools are not loaded yet
  document.addEventListener('contextmenu', event => {
    ctxEl = event.target
  })
}
