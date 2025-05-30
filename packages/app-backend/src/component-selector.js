import { throttle } from 'lodash-es'
import { highlight, unHighlight } from './highlighter'
import { findRelatedComponent } from './utils'
import { isBrowser } from '@utils/env'
import { bridge as exBridge, api } from './bridge'

export default class ComponentSelector {
  constructor(bridge, instanceMap) {
    const self = this
    self.bridge = bridge
    self.instanceMap = instanceMap
    self.bindMethods()

    exBridge.on(api.web.startComponentSelector, self.startSelecting)
    exBridge.on(api.web.stopComponentSelector, self.stopSelecting)
  }

  /**
   * Adds event listeners for mouseover and mouseup
   */
  startSelecting() {
    if (!isBrowser) return
    this.stopSelecting() // 防止重复绑定
    window.addEventListener('mouseover', this.elementMouseOver, true)
    window.addEventListener('pointerdown', this.elementClicked, true)
    window.addEventListener('click', this.cancelEvent, true)
    window.addEventListener('mouseout', this.cancelEvent, true)
    window.addEventListener('mouseenter', this.cancelEvent, true)
    window.addEventListener('mouseleave', this.cancelEvent, true)
    window.addEventListener('mousedown', this.cancelEvent, true)
    window.addEventListener('mouseup', this.cancelEvent, true)
  }

  /**
   * Removes event listeners
   */
  stopSelecting() {
    if (!isBrowser) return
    window.removeEventListener('mouseover', this.elementMouseOver, true)
    window.removeEventListener('pointerdown', this.elementClicked, true)
    window.removeEventListener('click', this.cancelEvent, true)
    window.removeEventListener('mouseout', this.cancelEvent, true)
    window.removeEventListener('mouseenter', this.cancelEvent, true)
    window.removeEventListener('mouseleave', this.cancelEvent, true)
    window.removeEventListener('mousedown', this.cancelEvent, true)
    window.removeEventListener('mouseup', this.cancelEvent, true)

    unHighlight()
  }

  /**
   * Highlights a component on element mouse over
   * @param {MouseEvent} e
   */
  elementMouseOver(e) {
    this.cancelEvent(e)

    const el = e.target
    if (el) {
      this.selectedInstance = findRelatedComponent(el)
    }

    unHighlight()
    if (this.selectedInstance) {
      highlight(this.selectedInstance)
    }
  }

  /**
   * Selects an instance in the component view
   * @param {MouseEvent} e
   */
  elementClicked(e) {
    this.cancelEvent(e)

    setTimeout(() => {
      if (this.selectedInstance) {
        window.__VUE_DEVTOOLS_INSPECT__(this.selectedInstance)
      } else {
        exBridge.send(api.devtool.stopComponentSelector)
      }
      this.stopSelecting()
    }, 180)
  }

  /**
   * Cancel a mouse event
   * @param {MouseEvent} e
   */
  cancelEvent(e) {
    e.stopImmediatePropagation()
    e.preventDefault()
  }

  /**
   * Bind class methods to the class scope to avoid rebind for event listeners
   */
  bindMethods() {
    this.startSelecting = this.startSelecting.bind(this)
    this.stopSelecting = this.stopSelecting.bind(this)
    this.elementMouseOver = throttle(this.elementMouseOver.bind(this), 50)
    this.elementClicked = this.elementClicked.bind(this)
  }
}
