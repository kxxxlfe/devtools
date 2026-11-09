import { onActivated, onBeforeUnmount, onDeactivated, onMounted, unref, watch } from 'vue'
import debounce from 'lodash/debounce'

// 跟随选中索引滚动虚拟列表，使当前记录保持在可视区域内。
export function useEntryList({ inspectedIndex, highDensity, scroller, indexOffset = 0 }) {
  let frameId = null
  let active = true

  const cancelFrame = () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
  }

  const scrollIntoInspected = debounce(
    () => {
      cancelFrame()
      let frames = 0

      const step = () => {
        // 等待两帧，让 defer 延迟渲染的内容完成挂载。
        if (++frames < 2) {
          frameId = requestAnimationFrame(step)
          return
        }
        frameId = null

        const index = unref(inspectedIndex) + indexOffset
        const element = scroller.value?.$el
        if (index < 0 || !element) return

        const height = unref(highDensity) ? 22 : 34
        const top = index * height
        if (top < element.scrollTop) {
          element.scrollTop = top
        } else if (top + height > element.scrollTop + element.clientHeight) {
          element.scrollTop = top + height - element.clientHeight
        }
      }

      frameId = requestAnimationFrame(step)
    },
    200,
    { leading: true },
  )

  const refreshScrollToInspected = () => {
    if (active) scrollIntoInspected()
  }

  const stop = () => {
    active = false
    scrollIntoInspected.cancel()
    cancelFrame()
  }

  watch(
    [() => unref(inspectedIndex), () => unref(highDensity), scroller],
    refreshScrollToInspected,
  )

  onMounted(refreshScrollToInspected)
  onActivated(() => {
    active = true
    refreshScrollToInspected()
  })
  onDeactivated(stop)
  onBeforeUnmount(stop)
}
