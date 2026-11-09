import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

// 配合 v-if="defer(priority)" 分帧渲染组件，减轻首次渲染的卡顿。
/**
 * Provide a reactive gate for displaying content in stages. The display priority
 * starts at zero and increases by one per animation frame after mount. Pending
 * frames are canceled before unmount.
 *
 * @param {number} [count=10] Target priority. At least one frame runs after mount,
 * even when count is zero or less; further frames run while priority is below count.
 * @returns {Object} An object with defer(priority), which returns whether the
 * current display priority is at least priority.
 */
export function useDefer(count = 10) {
  const displayPriority = shallowRef(0)
  let frameId = null

  const step = () => {
    frameId = requestAnimationFrame(() => {
      frameId = null
      displayPriority.value++
      if (displayPriority.value < count) {
        step()
      }
    })
  }

  onMounted(step)
  onBeforeUnmount(() => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
    }
  })

  const defer = priority => displayPriority.value >= priority

  return { defer }
}
