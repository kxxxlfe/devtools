import { inDoc } from '@utils/util'
import { checkVisibility } from '@utils/tools'
import { isBrowser, target } from '@utils/env'
import { isFragment } from './vue2'

/**
 * Get the client rect for an instance.
 *
 * @param {Vue|Vnode} instance
 * @return {Object}
 */

export function getInstanceOrVnodeRect(instance) {
  let el = instance.$el || instance.elm
  if (!isBrowser) {
    // TODO: Find position from instance or a vnode (for functional components).

    return
  }
  if (!inDoc(el)) {
    return
  }
  if (isFragment(instance)) {
    return getFragmentRect(instance)
  }

  if (el.nodeType === 1) {
    // such as `display: contents`
    if (!checkVisibility(el)) {
      el = Array.prototype.find.call(el.children, elm => elm.nodeType === 1)
    }

    return el?.getBoundingClientRect()
  }
}

/**
 * Highlight a fragment instance.
 * Loop over its node range and determine its bounding box.
 *
 * @param {Vue} instance
 * @return {Object}
 */

function getFragmentRect({ _fragmentStart, _fragmentEnd }) {
  let top, bottom, left, right
  const util = target.__VUE_DEVTOOLS_GLOBAL_HOOK__.env?.Vue.util
  util.mapNodeRange(_fragmentStart, _fragmentEnd, function (node) {
    let rect
    if (node.nodeType === 1 || node.getBoundingClientRect) {
      rect = node.getBoundingClientRect()
    } else if (node.nodeType === 3 && node.data.trim()) {
      rect = getTextRect(node)
    }
    if (rect) {
      if (!top || rect.top < top) {
        top = rect.top
      }
      if (!bottom || rect.bottom > bottom) {
        bottom = rect.bottom
      }
      if (!left || rect.left < left) {
        left = rect.left
      }
      if (!right || rect.right > right) {
        right = rect.right
      }
    }
  })
  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  }
}

let range
/**
 * Get the bounding rect for a text node using a Range.
 *
 * @param {Text} node
 * @return {Rect}
 */
function getTextRect(node) {
  if (!isBrowser) return
  if (!range) range = document.createRange()

  range.selectNode(node)

  return range.getBoundingClientRect()
}
