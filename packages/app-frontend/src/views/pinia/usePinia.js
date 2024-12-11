import { ref } from 'vue'
import { bridge as exBridge } from '@utils/ext-bridge/devtool'
import { parse } from '@utils/util'

const stores = ref([])
const currStoreKey = ref('')
const inspectedState = ref({})
exBridge.on(`${exBridge.Plat.devtool}/pinia/init`, function ({ storeList }) {
  stores.value = storeList
})
exBridge.on(`${exBridge.Plat.devtool}/pinia/updateState`, function ({ key, state }) {
  currStoreKey.value = key
  inspectedState.value = parse(state) || {}
})

export const usePinia = function () {
  const selectStore = async function (key) {
    currStoreKey.value = key
    const { data } = await exBridge.request(`${exBridge.Plat.web}/pinia/select`, { key })
    inspectedState.value = parse(data?.data?.state || '') || {}
  }

  const editPinia = async function (args) {
    const { data } = await exBridge.request(`${exBridge.Plat.web}/pinia/editState`, {
      ...args,
      storeKey: currStoreKey.value,
    })
    const { key, state } = data.data || {}
    currStoreKey.value = key
    inspectedState.value = parse(state) || {}
  }

  return { stores, currStoreKey, selectStore, inspectedState, editPinia }
}
