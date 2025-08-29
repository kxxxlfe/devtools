import { watch } from 'vue'
import { useSharedData } from '@utils/shared-data'

let pendingAction = null

const { sharedData } = useSharedData()

export function whenDevtoolActive(cb) {
  if (sharedData.value.devtoolPageActive) {
    cb()
  } else {
    pendingAction = cb
  }
}

// when devtool active, run last cb
watch(
  () => sharedData.value.devtoolPageActive,
  function (n) {
    if (n && pendingAction) {
      pendingAction()
      pendingAction = null
    }
  }
)
