<template>
  <div>
    <split-pane v-if="hasVuex">
      <vuex-history v-if="defer(3)" slot="left" />
      <vuex-state-inspector v-if="defer(5)" slot="right" />
    </split-pane>
    <div v-else class="notice">
      <div>No Vuex store detected.</div>
    </div>
  </div>
</template>

<script>
import { useDefer } from '@front/composables/useDefer'

import SplitPane from '@front/components/SplitPane.vue'
import VuexHistory from './VuexHistory.vue'
import VuexStateInspector from './VuexStateInspector.vue'
import { useVuex } from './useVuex'

export default {
  components: {
    SplitPane,
    VuexHistory,
    VuexStateInspector,
  },

  setup(props, { emit }) {
    const { defer } = useDefer()
    const { hasVuex } = useVuex()
    return { defer, hasVuex }
  },
}
</script>
