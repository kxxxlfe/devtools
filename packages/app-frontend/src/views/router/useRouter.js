// router: 页面跳转时触发
import { reactive, computed } from 'vue'
import { bridge as exBridge, api } from '@front/bridge'
import { useSharedData } from '@utils/shared-data'
import { parse } from '@utils/util'

let uid = 0

const state = reactive({
  hasRouter: false,
  instances: [],
  routeChanges: [],
  inspectedIndex: -1,
  filter: '',
})

// getters
const activeRouteChange = computed(() => {
  return state.routeChanges[state.inspectedIndex]
})

const filteredRoutes = computed(() => {
  return state.routeChanges.filter(routeChange => {
    return routeChange.from.fullPath.indexOf(state.filter) > -1 || routeChange.to.fullPath.indexOf(state.filter) > -1
  })
})

// mutations -> methods
function init(payload) {
  payload.current.id = uid++
  state.instances = []
  state.routeChanges = [payload.current]
  state.inspectedIndex = -1
  state.hasRouter = true
  state.instances.push(payload)
}

function reset() {
  state.routeChanges = []
  state.inspectedIndex = -1
}

function changed(payload) {
  payload.id = uid++
  state.routeChanges.push(payload)
  if (!state.filter) {
    state.inspectedIndex = state.routeChanges.length - 1
  }
}

function inspect(index) {
  state.inspectedIndex = index
}

function updateFilter(filter) {
  state.filter = filter
}

// bridge events
exBridge.on(api.router.init, payload => {
  init(parse(payload))
})

exBridge.on(api.router.changed, payload => {
  changed(parse(payload))
})

export const useRouter = function () {
  const { updateSharedData, sharedData } = useSharedData()

  const toggleRecording = function () {
    updateSharedData({ recordRouter: !recordRouter.value })
  }

  const recordRouter = computed(() => {
    return sharedData.value.recordRouter
  })

  return {
    state,
    hasRouter: computed(() => state.hasRouter),
    routeChanges: computed(() => state.routeChanges),
    inspectedIndex: computed(() => state.inspectedIndex),
    filter: computed({
      get: () => state.filter,
      set: (val) => updateFilter(val),
    }),
    activeRouteChange,
    filteredRoutes,
    init,
    reset,
    changed,
    inspect,
    updateFilter,
    toggleRecording,
    recordRouter,
  }
}
