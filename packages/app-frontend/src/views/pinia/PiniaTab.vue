<template>
  <div>
    <split-pane v-if="hasPinia">
      <PiniaStoreList slot="left" />
      <PiniaStateInspector slot="right" />
    </split-pane>
    <div v-else class="notice">
      <div>No Pinia store detected.</div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import SplitPane from '@front/components/SplitPane.vue'
import PiniaStoreList from './PiniaStoreList.vue'
import PiniaStateInspector from './PiniaStateInspector.vue'

import { usePinia } from './usePinia'

export default {
  components: {
    SplitPane,
    PiniaStoreList,
    PiniaStateInspector,
  },

  setup(props, { emit }) {
    const { stores } = usePinia()

    const hasPinia = computed(() => !!stores.value.length)

    return { hasPinia }
  },
}
</script>
