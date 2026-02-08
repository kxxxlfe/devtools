<template>
  <scroll-pane>
    <action-header slot="header">
      <div class="search">
        <VueIcon icon="search" />
        <input v-model.trim="filter" placeholder="Filter inspected state" />
      </div>
    </action-header>
    <div slot="scroll" class="vuex-state-inspector">
      <state-inspector :state="piniaData" :dim-after="-1" @edit="editPinia" />
    </div>
  </scroll-pane>
</template>

<script>
import { computed, provide } from 'vue'
import isEmpty from 'lodash/isEmpty'

import ScrollPane from '@front/components/ScrollPane.vue'
import ActionHeader from '@front/components/ActionHeader.vue'
import StateInspector from '@front/components/StateInspector.vue'

import { usePinia } from './usePinia'

export default {
  components: {
    ScrollPane,
    ActionHeader,
    StateInspector,
  },

  setup(props, { emit }) {
    const { inspectedState, editPinia } = usePinia()

    provide('InspectorInjection', {
      editable: true,
    })

    const piniaData = computed(() => {
      if (isEmpty(inspectedState.value)) {
        return {}
      }
      const obj2arr = obj => {
        return Object.entries(obj || {}).map(([key, value]) => {
          return {
            key,
            type: key,
            value,
          }
        })
      }
      const { state, actions, computed: getter } = inspectedState.value

      return {
        state: obj2arr(state).map(item => {
          item.editable = true
          return item
        }),
        actions: obj2arr(actions),
        computed: obj2arr(getter),
      }
    })

    return { piniaData, editPinia }
  },

  data() {
    return {
      filter: '',
    }
  },
}
</script>

<style scoped>
.state-info {
  display: flex;
  align-items: center;
  padding: 2px 2px 2px 14px;
  min-height: 36px;
  font-size: 14px;

  .label {
    flex: 1;
    display: flex;
    align-items: center;
    color: var(--blueishGrey);

    .vue-ui-icon {
      margin-right: 8px;
    }
  }

  .note {
    opacity: .7;
    margin-left: 4px;
  }
}

.state-info .label .vue-ui-icon :deep(svg) {
  fill: var(--blueishGrey);
}

.loading-vuex-state {
  padding-right: 14px;
}

.pointer {
  cursor: pointer;
}

.message {
  margin-left: 5px;
  transition: all .3s ease;
  color: var(--blue);
}

.invalid-json {
  right: 20px;
  left: initial;
  top: 1px;
  font-size: 12px;
  color: var(--red);
  background-color: var(--background-color);
  .vue-ui-dark-mode & {
    background-color: var(--dark-background-color);
  }
}

.import-state {
  transition: all .2s ease;
  width: 300px;
  position: absolute;
  z-index: 1;
  left: 220px;
  right: 10px;
  top: 45px;
  box-shadow: 4px 4px 6px 0 var(--border-color);
  border: 1px solid var(--border-color);
  padding: 3px;
  background-color: var(--background-color);
  .vue-ui-dark-mode & {
    background-color: var(--dark-background-color);
    box-shadow: 4px 4px 6px 0 var(--dark-border-color);
    border: 1px solid var(--dark-border-color);
  }
  &:after {
    content: 'Press ESC to close';
    position: absolute;
    bottom: 0;
    padding: 5px;
    color: inherit;
    opacity: .5;
  }

  textarea {
    width: 100%;
    height: 100px;
    display: block;
    outline: none;
    border: none;
    resize: vertical;
    .vue-ui-dark-mode & {
      color: #DDD;
      background-color: var(--dark-background-color);
    }
  }
}
</style>
