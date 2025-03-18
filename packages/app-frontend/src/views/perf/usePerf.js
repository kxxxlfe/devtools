import { ref, computed, set } from 'vue'
import { bridge as exBridge } from '@front/bridge'

exBridge.on(`${exBridge.Plat.devtool}/perf/add-metric`, data => {
  window.store.commit('perf/ADD_METRIC', data)
})

exBridge.on(`${exBridge.Plat.devtool}/perf/upsert-metric`, ({ type, data }) => {
  window.store.commit('perf/UPSERT_METRIC', { type, data })
})

export const usePerf = function () {
  return {}
}
