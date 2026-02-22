import { inDoc, getComponentName, getComponentDisplayName } from '@utils/util'
import SharedData from '@utils/shared-data'
import { isBrowser, target } from '@utils/env'
import { engine } from './engine'

let overlay: HTMLDivElement
let overlayContent

function init() {
  if (overlay || !isBrowser) return
  overlay = document.createElement('div')
  overlay.style.backgroundColor = 'rgba(104, 182, 255, 0.35)'
  overlay.style.position = 'fixed'
  overlay.style.zIndex = '99999999999999'
  overlay.style.pointerEvents = 'none'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.borderRadius = '3px'
  overlayContent = document.createElement('div')
  overlayContent.style.backgroundColor = 'rgba(104, 182, 255, 0.9)'
  overlayContent.style.fontFamily = 'monospace'
  overlayContent.style.fontSize = '11px'
  overlayContent.style.padding = '2px 3px'
  overlayContent.style.borderRadius = '3px'
  overlayContent.style.color = 'white'
  overlay.appendChild(overlayContent)
}

/**
 * Highlight an instance.
 *
 * @param {Vue} instance
 */

export function highlight(instance) {
  if (!instance) return
  const rect = engine.getInstanceOrVnodeRect(instance)

  if (!isBrowser) {
    // TODO: Highlight rect area.
    return
  }

  init()
  if (rect) {
    const content = []
    let name = instance.fnContext ? getComponentName(instance.fnOptions) : engine.getInstanceName(instance)
    name = getComponentDisplayName(name, SharedData.componentNameStyle)
    if (name) {
      const pre = document.createElement('span')
      pre.style.opacity = '0.6'
      pre.innerText = '<'
      const text = document.createTextNode(name)
      const post = document.createElement('span')
      post.style.opacity = '0.6'
      post.innerText = '>'
      content.push(pre, text, post)
    }
    showOverlay(rect, content)
    overlay.setAttribute('vid', instance.__VUE_DEVTOOLS_UID__)
  }
}

/**
 * Remove highlight overlay.
 */

export function unHighlight(id) {
  if (!overlay) {
    return
  }
  if (id) {
    if (overlay.getAttribute('vid') !== id) {
      return
    }
  }
  if (overlay.parentNode) {
    document.body.removeChild(overlay)
  }
}

/**
 * Display the overlay with given rect.
 *
 * @param {Rect}
 */

function showOverlay({ width = 0, height = 0, top = 0, left = 0 }, content = []) {
  if (!isBrowser) return

  overlay.style.width = ~~width + 'px'
  overlay.style.height = ~~height + 'px'
  overlay.style.top = ~~top + 'px'
  overlay.style.left = ~~left + 'px'

  overlayContent.innerHTML = ''
  content.forEach(child => overlayContent.appendChild(child))

  document.body.appendChild(overlay)
  // console.log('overlay', width, height, left, top)
}
