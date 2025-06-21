import { ref, computed, set } from 'vue'
import { bridge as exBridge, api } from '@front/bridge'
import { parse, parseFlatted } from '@utils/util'
import { useDevPanelStatus } from '../../plugins/usePanelStatus'
import router from '../../router'
import { useComponentTree } from './module'

// 选中的组件数据
const inspected = {
  id: ref(null),
  map: ref({}),
  loading: ref(false),
}
const { ensurePaneShown } = useDevPanelStatus()
const { toggleInstance, instancesMap, flush } = useComponentTree()

// web点击dom触发，inspectInstance
const inspectInstance = id => {
  ensurePaneShown(() => {
    selectInstance(id)
    const { currentRoute } = router
    if (currentRoute?.name !== 'components') {
      router.push({ name: 'components' })
    }
    const instance = instancesMap.value[id]
    instance &&
      toggleInstance({
        instance,
        expanded: true,
        parent: true,
      })
  })
}
exBridge.on(api.devtool.inspectInstance, inspectInstance)
exBridge.on(api.devtool.updateInstance, ({ id, instance }) => {
  ensurePaneShown(() => {
    set(inspected.map.value, id, parse(instance))
    inspected.id.value = id
  })
})
exBridge.on(api.devtool.flush, payload => {
  flush(parse(payload))
})

// 组件选中
const isSelecting = ref(false) // 当前是否正在选择Component
function setSelecting(value) {
  if (isSelecting.value !== value) {
    isSelecting.value = value

    if (isSelecting.value) {
      exBridge.send(api.web.startComponentSelector)
    } else {
      exBridge.send(api.web.stopComponentSelector)
    }
  }
}
// 点击component树触发
const selectInstance = async function (id) {
  await exBridge.request(api.web.selectInstance, id)
  setSelecting(false)
  inspected.loading.value = true

  // 获取instance最新的state
  const msgdata = await exBridge.request(api.web.fetchInstance, id)
  const msgJSON = parse(msgdata)
  set(inspected.map.value, id, msgJSON)
  inspected.id.value = id
  inspected.loading.value = false
}

export const useComponent = function () {
  const freshComponentData = function () {
    exBridge.send(api.web.flush)
  }

  const inspectedInstance = computed(() => {
    return inspected.map.value[inspected.id.value] || {}
  })
  return { isSelecting, setSelecting, selectInstance, freshComponentData, inspectedInstance, inspected }
}

// inspect contextmenu instance
export async function inspectContextMenuInstance() {
  exBridge.send(api.web.inspectCtxMenuInst)
}
