import { parse } from '@utils/util'
import { useEvents } from '../events/useEvents'
import { useRouter } from '../router/useRouter'

const { events } = useEvents()
const { state: routerState } = useRouter()

export const FPS_MARKERS_PRECISION = 1000

export default {
  namespaced: true,

  state: () => ({
    currentBenchmark: null,
    benchmarks: [],
  }),

  getters: {
    metrics: state => (state.currentBenchmark && state.currentBenchmark.metrics) || {},

    fpsMarkers(state, getters) {
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

      const { history } = rootState.vuex
      addEntries('mutations', history, entry => ({
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
    },
  },

  mutations: {
    SET_CURRENT_BENCHMARK(state, value) {
      state.currentBenchmark = value
    },

    UPDATE_BENCHMARK(state, data) {
      Object.assign(state.currentBenchmark, data)
    },

    ADD_BENCHMARK(state, benchmark) {
      state.benchmarks.splice(0, 0, benchmark)
    },

    ADD_METRIC(state, metric) {
      state.currentBenchmark.metrics[metric.type].push(metric)
    },

    UPSERT_METRIC(state, { type, data }) {
      const list = state.currentBenchmark.metrics[type]
      const metric = list.find(m => m.id === data.id)
      if (metric) {
        Object.assign(metric, data)
      } else {
        list.push(data)
      }
    },
  },
}
