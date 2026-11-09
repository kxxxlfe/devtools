import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

/**
 * 分帧渲染：组件挂载后，每个动画帧将渲染进度增加 1，
 * 配合 v-if="defer(priority)" 分批创建组件，减轻首次集中渲染的开销。
 * priority 越小越早渲染，表示帧进度阈值，而非延迟毫秒数。
 * 每次调用独立维护进度，组件销毁时自动取消尚未执行的动画帧。
 *
 * @param {number} count 渲染进度上限，默认为 10；应为正整数，并覆盖所有 priority。
 * @returns {{ defer: (priority: number) => boolean }} 判断当前进度是否达到指定阈值。
 * @example
 * // 在 setup() 中调用，并将 defer 暴露给模板。
 * const { defer } = useDefer()
 * // 模板：<HeavyPanel v-if="defer(2)" />
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
