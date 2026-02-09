<template>
  <div>
    <split-pane v-if="hasRouter">
      <router-history slot="left" />
      <router-meta slot="right" />
    </split-pane>
    <div
      v-else
      class="notice"
    >
      <div>
        No router detected.
      </div>
    </div>
  </div>
</template>

<script>
import SplitPane from '@front/components/SplitPane.vue'
import RouterHistory from './RouterHistory.vue'
import RouterMeta from './RouterMeta.vue'
import { useRouter } from './useRouter'

export default {
  components: {
    SplitPane,
    RouterHistory,
    RouterMeta
  },

  setup() {
    const { hasRouter } = useRouter()
    return { hasRouter }
  },
}
</script>
