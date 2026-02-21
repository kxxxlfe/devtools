import { throttle, debounce } from 'lodash-es'
import { highlight, unHighlight } from './highlighter'
import { isBrowser } from '@utils/env'
import { bridge as exBridge, api } from './bridge'
import { engine } from './engine'

const isTouch = 'ontouchstart' in window

export default class ComponentSelector {
  constructor(instanceMap) {
    const self = this
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
    window.addEventListener('pointerover', this.elementMouseOver, true)
    window.addEventListener('pointerdown', this.elementClicked, true)
    window.addEventListener('touchdown', this.cancelEvent, true)
    window.addEventListener('click', this.cancelEvent, true)
    window.addEventListener('pointerout', this.cancelEvent, true)
    window.addEventListener('pointerenter', this.cancelEvent, true)
    window.addEventListener('pointerleave', this.cancelEvent, true)
    // window.addEventListener('mousedown', this.cancelEvent, true)
    window.addEventListener('pointerup', this.cancelEvent, true)
  }

  /**
   * Removes event listeners
   */
  stopSelecting() {
    if (!isBrowser) return
    window.removeEventListener('pointerover', this.elementMouseOver, true)
    window.removeEventListener('pointerdown', this.elementClicked, true)
    window.removeEventListener('touchdown', this.cancelEvent, true)
    window.removeEventListener('click', this.cancelEvent, true)
    window.removeEventListener('pointerout', this.cancelEvent, true)
    window.removeEventListener('pointerenter', this.cancelEvent, true)
    window.removeEventListener('pointerleave', this.cancelEvent, true)
    // window.removeEventListener('mousedown', this.cancelEvent, true)
    window.removeEventListener('pointerup', this.cancelEvent, true)

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
      this.selectedInstance = engine.findComponentByEl(el)
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

    this.chooseInstance()
  }

  // device mode has delay
  chooseInstance = debounce(
    () => {
      if (this.selectedInstance) {
        window.__VUE_DEVTOOLS_INSPECT__(this.selectedInstance)
      } else {
        exBridge.send(api.devtool.stopedComponentSelector)
      }
      this.stopSelecting()
    },
    isTouch ? 400 : 200
  )

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
