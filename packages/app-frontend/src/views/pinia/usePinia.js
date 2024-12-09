import { ref } from 'vue'
import { bridge as exBridge } from '@utils/ext-bridge/devtool'

const stores = ref([])
const currStoreKey = ref('')
const inspectedState = ref({})
exBridge.on(`${exBridge.Plat.devtool}/pinia/init`, function ({ storeList }) {
  stores.value = storeList
})
exBridge.on(`${exBridge.Plat.devtool}/pinia/updateState`, function ({ key, state }) {
  currStoreKey.value = key
  inspectedState.value = state
})

export const usePinia = function () {
  const selectStore = async function (key) {
    currStoreKey.value = key
    const data = await exBridge.request(`${exBridge.Plat.web}/pinia/select`, { key })
    inspectedState.value = data
  }

  return { stores, currStoreKey, selectStore, inspectedState }
}
