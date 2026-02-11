// routes: 注册route触发
import { reactive, computed } from 'vue'
import { bridge as exBridge, api } from '@front/bridge'
import { parse } from '@utils/util'
import { useRouter } from '../router/useRouter'

const { state: routerState } = useRouter()

const state = reactive({
  hasRouter: false,
  routeChanges: [],
  inspectedIndex: -1,
  filter: '',
})

// getters -> computed
const activeRouteChange = computed(() => {
  if (typeof state.inspectedIndex === 'string') {
    const path = state.inspectedIndex.split('_')
    let obj = state.routeChanges[parseInt(path[0])]
    for (let i = 1, len = path.length; i < len; ++i) {
      obj = obj.children[parseInt(path[i])]
    }
    return obj
  }
  return state.routeChanges[state.inspectedIndex]
})

const activeRoute = computed(() => {
  return state.routeChanges.find(change =>
    routerState.routeChanges.find(historyChange => historyChange.to.path === change.path)
  )
})

const filteredRoutes = computed(() => {
  return state.routeChanges.filter(routeChange => {
    return routeChange.path.indexOf(state.filter) > -1
  })
})

// mutations -> methods
function init(payload) {
  state.inspectedIndex = -1
  state.hasRouter = true
  state.routeChanges = payload.routeChanges
}

function changed(payload) {
  state.routeChanges.push(payload)
}

function inspect(index) {
  state.inspectedIndex = index
}

function updateFilter(filter) {
  state.filter = filter
}

// bridge events
exBridge.on(api.routes.init, payload => {
  init(parse(payload))
})

exBridge.on(api.routes.changed, payload => {
  changed(parse(payload))
})

export const useRoutes = function () {
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
    activeRoute,
    filteredRoutes,
    init,
    changed,
    inspect,
    updateFilter,
  }
}
