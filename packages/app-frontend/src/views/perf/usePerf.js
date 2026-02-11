import { reactive, computed } from 'vue'
import { parse } from '@utils/util'
import { bridge as exBridge, api } from '@front/bridge'
import { useEvents } from '../events/useEvents'
import { useRouter } from '../router/useRouter'
import { useVuex } from '../vuex/useVuex'

const { events } = useEvents()
const { state: routerState } = useRouter()
const { state: vuexState } = useVuex()

export const FPS_MARKERS_PRECISION = 1000

const state = reactive({
  currentBenchmark: null,
  benchmarks: [],
})

const metrics = computed(() => {
  return (state.currentBenchmark && state.currentBenchmark.metrics) || {}
})

const fpsMarkers = computed(() => {
  const { currentBenchmark } = state
  let markers = {}
  if (!currentBenchmark) return markers

  const addEntries = (type, list, getInfo) => {
    for (const entry of list) {
      if (
        entry.timestamp < currentBenchmark.start ||
        (currentBenchmark.end != null && entry.timestamp > currentBenchmark.end)
      ) {
        continue
      }
      const time = Math.round(entry.timestamp / FPS_MARKERS_PRECISION) * FPS_MARKERS_PRECISION
      let marker = (markers[time] = markers[time] || {
        time,
        bubbles: {},
      })
      let bubble = (marker.bubbles[type] = marker.bubbles[type] || {
        type,
        entries: [],
      })
      bubble.entries.push({
        ...getInfo(entry),
        timestamp: entry.timestamp,
      })
    }
  }

  addEntries('mutations', vuexState.history, entry => ({
    label: entry.mutation.type,
    state: {
      'mutation info': {
        payload: parse(entry.mutation.payload),
      },
    },
  }))

  addEntries('events', events.value, entry => ({
    label: entry.eventName,
    state: {
      'event info': {
        name: entry.eventName,
        type: entry.type,
        source: `<${entry.instanceName}>`,
        payload: entry.payload,
      },
    },
  }))

  const { routeChanges } = routerState
  addEntries('routes', routeChanges, entry => ({
    label: entry.to.fullPath,
    state: {
      from: entry.from,
      to: entry.to,
    },
  }))

  return markers
})

function setCurrentBenchmark(value) {
  state.currentBenchmark = value
}

function updateBenchmark(data) {
  Object.assign(state.currentBenchmark, data)
}

function addBenchmark(benchmark) {
  state.benchmarks.splice(0, 0, benchmark)
}

function addMetric(metric) {
  state.currentBenchmark.metrics[metric.type].push(metric)
}

function upsertMetric({ type, data }) {
  const list = state.currentBenchmark.metrics[type]
  const metric = list.find(m => m.id === data.id)
  if (metric) {
    Object.assign(metric, data)
  } else {
    list.push(data)
  }
}

exBridge.on(api.devtool.perf.addMetric, data => {
  addMetric(data)
})

exBridge.on(api.devtool.perf.upsertMetric, ({ type, data }) => {
  upsertMetric({ type, data })
})

export const usePerf = function () {
  return {
    state,
    currentBenchmark: computed(() => state.currentBenchmark),
    benchmarks: computed(() => state.benchmarks),
    metrics,
    fpsMarkers,
    setCurrentBenchmark,
    updateBenchmark,
    addBenchmark,
    addMetric,
    upsertMetric,
  }
}
