import { ref, computed, set } from 'vue'
import { bridge as exBridge } from '@utils/ext-bridge/devtool'
import { parse } from '@utils/util'
import { useDevPanelStatus } from '../../plugins/usePanelStatus'
import router from '../../router'

// 选中的组件数据
const inspected = {
  id: ref(null),
  map: ref({}),
  loading: ref(false),
}
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
exBridge.on(`${exBridge.Plat.devtool}/update-instance`, ({ id, instance }) => {
  ensurePaneShown(() => {
    set(inspected.map.value, id, parse(instance))
    inspected.id.value = id
  })
})

// 组件选中
const isSelecting = ref(false) // 当前是否正在选择Component
function setSelecting(value) {
  if (isSelecting.value !== value) {
    isSelecting.value = value

    if (isSelecting.value) {
      exBridge.send(`${exBridge.Plat.web}/start-component-selector`)
    } else {
      exBridge.send(`${exBridge.Plat.web}/stop-component-selector`)
    }
  }
}
// 点击component树触发
const selectInstance = async function (id) {
  await exBridge.request(`${exBridge.Plat.web}/select-instance`, id)
  setSelecting(false)
  inspected.loading.value = true

  // 获取instance最新的state
  const msgdata = await exBridge.request(`${exBridge.Plat.web}/fetch-instance`, id)
  set(inspected.map.value, id, parse(msgdata.data.data))
  inspected.id.value = id
  inspected.loading.value = false
}

export const useComponent = function () {
  const freshComponentData = function () {
    exBridge.send(`${exBridge.Plat.web}/flush`)
  }

  const inspectedInstance = computed(() => {
    return inspected.map.value[inspected.id.value] || {}
  })
  return { isSelecting, setSelecting, selectInstance, freshComponentData, inspectedInstance, inspected }
}
