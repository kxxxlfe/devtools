import { ref } from 'vue'
import { bridge as exBridge } from '@utils/ext-bridge/devtool'
import { useDevPanelStatus } from '../../plugins/usePanelStatus'
import router from '../../router'

const { ensurePaneShown } = useDevPanelStatus()

// web点击dom触发，inspectInstance
exBridge.on(`${exBridge.Plat.devtool}/inspect-instance`, id => {
  ensurePaneShown(() => {
    selectInstance(id)
    router.push({ name: 'components' })
    const instance = window.store.state.components.instancesMap[id]
    instance &&
      store.dispatch('components/toggleInstance', {
        instance,
        expanded: true,
        parent: true,
      })
  })
})

const isSelecting = ref(false) // 当前是否正在选择Component
function setSelecting(value) {
  if (isSelecting.value !== value) {
    isSelecting.value = value

    if (isSelecting.value) {
      bridge.send('start-component-selector')
    } else {
      bridge.send('stop-component-selector')
    }
  }
}
// 点击component树触发
const selectInstance = async function (id) {
  await exBridge.request(`${exBridge.Plat.web}/select-instance`, id)
  setSelecting(false)
}

export const useComponent = function () {
  return { isSelecting, setSelecting, selectInstance }
}
