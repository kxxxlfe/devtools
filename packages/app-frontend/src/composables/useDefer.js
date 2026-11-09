import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

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
