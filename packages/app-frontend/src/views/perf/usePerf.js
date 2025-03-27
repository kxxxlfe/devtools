import { ref, computed, set } from 'vue'
import { bridge as exBridge, api } from '@front/bridge'

exBridge.on(api.devtool.perf.addMetric, data => {
  window.store.commit('perf/ADD_METRIC', data)
})

exBridge.on(api.devtool.perf.upsertMetric, ({ type, data }) => {
  window.store.commit('perf/UPSERT_METRIC', { type, data })
})

export const usePerf = function () {
  return {}
}
