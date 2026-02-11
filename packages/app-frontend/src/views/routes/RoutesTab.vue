<template>
  <div>
    <split-pane v-if="hasRouter">
      <routes-tree slot="left" />
      <routes-meta slot="right" />
    </split-pane>
    <div
      v-else
      class="notice"
    >
      <div>
        No routes detected.
      </div>
    </div>
  </div>
</template>

<script>
import SplitPane from '@front/components/SplitPane.vue'
import RoutesTree from './RoutesTree.vue'
import RoutesMeta from './RoutesMeta.vue'
import { useRoutes } from './useRoutes'

export default {
  components: {
    SplitPane,
    RoutesMeta,
    RoutesTree
  },

  setup () {
    const { hasRouter } = useRoutes()
    return { hasRouter }
  },
}
</script>
