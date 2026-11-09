<template>
  <div>
    <split-pane>
      <events-history v-if="defer(3)" slot="left" />
      <event-inspector slot="right" />
    </split-pane>
  </div>
</template>

<script>
import { useDefer } from '@front/composables/useDefer'

import SplitPane from '@front/components/SplitPane.vue'
import EventsHistory from './EventsHistory.vue'
import EventInspector from './EventInspector.vue'
import { useEvents } from './useEvents'

export default {
  components: {
    SplitPane,
    EventsHistory,
    EventInspector,
  },
  setup(props, { emit }) {
    const { defer } = useDefer()
    const {} = useEvents()

    return { defer }
  },
}
</script>
