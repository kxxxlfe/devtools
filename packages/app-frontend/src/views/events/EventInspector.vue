<template>
  <scroll-pane>
    <div v-if="activeEvent" slot="scroll">
      <state-inspector :state="{ 'event info': sortedEventData }" />
    </div>
    <div v-else slot="scroll" class="no-event-data">No event selected</div>
  </scroll-pane>
</template>

<script>
import { defineComponent, computed } from 'vue'
import ScrollPane from '@front/components/ScrollPane.vue'
import StateInspector from '@front/components/StateInspector.vue'

import { useEvents } from './useEvents'

export default defineComponent({
  components: {
    ScrollPane,
    StateInspector,
  },

  setup(props, { emit }) {
    const { activeEvent } = useEvents()

    const sortedEventData = computed(() => {
      if (!activeEvent.value) {
        return {}
      }
      return {
        name: activeEvent.value.eventName,
        type: activeEvent.value.type,
        source: '<' + activeEvent.value.instanceName + '>',
        payload: activeEvent.value.payload,
      }
    })

    return { activeEvent, sortedEventData }
  },
})
</script>

<style scoped>
section:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
  .vue-ui-dark-mode & {
    border-bottom: 1px solid var(--dark-border-color);
  }
}

.component-name {
  margin: 0 10px;
}

.string {
  color: var(--red);
}

.literal {
  color: #03c;
}

.no-event-data {
  color: #ccc;
  text-align: center;
  margin-top: 50px;
  line-height: 30px;
}
</style>
