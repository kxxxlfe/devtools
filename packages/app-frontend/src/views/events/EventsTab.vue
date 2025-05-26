<template>
  <div>
    <split-pane>
      <events-history v-if="defer(3)" slot="left" />
      <event-inspector slot="right" />
    </split-pane>
  </div>
</template>

<script>
import Defer from '@front/mixins/defer'

import SplitPane from '@front/components/SplitPane.vue'
import EventsHistory from './EventsHistory.vue'
import EventInspector from './EventInspector.vue'

export default {
  components: {
    SplitPane,
    EventsHistory,
    EventInspector,
  },
  setup(props, { emit }) {
    const { enabled } = useEvents()

    return { enabled }
  },

  mixins: [Defer()],
}
</script>
