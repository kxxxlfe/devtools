<template>
  <scroll-pane>
    <action-header slot="header">
      <a
        v-tooltip="$t(`VuexHistory.${recordPinia ? 'stopRecording' : 'startRecording'}.tooltip`)"
        class="button toggle-recording"
        @click="toggleRecording"
      >
        <VueIcon :class="{ enabled: recordPinia }" class="small" icon="lens" />
        <span>{{ recordPinia ? 'Recording' : 'Paused' }}</span>
      </a>
    </action-header>
    <RecycleScroller
      slot="scroll"
      :items="storeList"
      :item-size="highDensity ? 22 : 34"
      class="history"
      :class="{
        'high-density': highDensity,
      }"
    >
      <template slot-scope="{ item: entry, index, active }">
        <div
          v-if="!entry.mutation"
          :class="{ active: isInspected(index, entry), disabled: !recordPinia }"
          class="entry list-item special"
          @click="inspect(entry, index)"
        >
          <span class="entry-info">
            <span class="mutation-type">{{ entry.name }}</span>
          </span>
        </div>
      </template>
    </RecycleScroller>
  </scroll-pane>
</template>

<script>
import { computed, onMounted } from 'vue'
import SharedData from '@utils/shared-data'
import ScrollPane from '@front/components/ScrollPane.vue'
import ActionHeader from '@front/components/ActionHeader.vue'

import { usePinia } from './usePinia'

export default {
  components: {
    ActionHeader,
    ScrollPane,
  },

  setup(props, { emit }) {
    const { currStoreKey, stores, selectStore } = usePinia()

    function isInspected(index, entry) {
      return entry.name === currStoreKey.value
    }

    const highDensity = computed(() => {
      const pref = SharedData.displayDensity
      return (pref === 'auto' && this.stores.length > 7) || pref === 'high'
    })

    function toggleRecording() {
      SharedData.recordPinia = !SharedData.recordPinia
    }
    const recordPinia = computed(() => {
      return SharedData.recordPinia
    })

    const storeList = computed(() => {
      return stores.value.map(item => {
        return {
          ...item,
          id: item.name,
        }
      })
    })

    function inspect(entry, index) {
      if (!recordPinia.value) {
        return
      }
      selectStore(entry.name)
    }

    onMounted(() => {
      if (currStoreKey.value) {
        selectStore(currStoreKey.value)
      }
    })

    return { currStoreKey, stores, isInspected, highDensity, recordPinia, toggleRecording, storeList, inspect }
  },

  methods: {},
}
</script>

<style scoped>
.vue-recycle-scroller {
  height: 100%;
}
.history {
  width: 100%;
}

.entry {
  font-family: Menlo, Consolas, monospace;
  cursor: pointer;
  padding: 7px 20px;
  font-size: 12px;
  box-shadow: inset 0 1px 0px rgba(0, 0, 0, .08);
  min-height: 34px;
  transition: padding-top .15s, padding-bottom .15s, min-height .15s;
  &,
  .entry-info {
    display: flex;
  }
  .entry-info {
    flex: 100% 1 1;
    overflow: hidden;
  }
  &.active {
    .time {
      color: #cbecdd;
    }
    .action {
      color: #cbecdd;
      &:hover {
        color: #f5fbf8;
      }
    }
    .label.inspected {
      background-color: #9c76cb;
    }
  }
  &.special {
    .mutation-type {
      font-style: italic;
      opacity: .75;
    }
  }
  @media (max-width: 1100px) {
    .label {
      display: none;
    }
    &.inspected {
      border-left: 4px solid #9369c6;
      padding-left: 16px;
    }
  }
  .vue-ui-icon, span, a {
    display: inline-block;
    vertical-align: middle;
  }
  .mutation-type {
    line-height: 20px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    flex: auto 0 1;
    margin-right: 4px;
  }
  .entry-actions {
    display: none;
    flex: none;
    padding-right: 12px;
  }
  &:hover {
    .entry-actions {
      display: inline-block;
    }
  }
  .vue-ui-dark-mode & {
    &.active {
      .mutation-type {
        color: #fff;
      }
    }
  }
  .high-density & {
    padding: 1px 20px;
    min-height: 22px;
  }
}

.action {
  color: #999;
  font-size: 11px;
  display: inline-block;
  vertical-align: middle;
  margin-left: 10px;
  white-space: nowrap;
  span {
    display: none;
    @media (min-width: 1400px) {
      display: inline;
    }
  }
  .vue-ui-icon {
    width: 18px;
    height: 18px;
    margin-right: 2px;
  }
  &:hover {
    color: var(--active-color);
  }
}

.entry.active .action .vue-ui-icon :deep(svg) {
  fill: #cbecdd;
}

.entry.active .action:hover .vue-ui-icon :deep(svg) {
  fill: #f5fbf8;
}

.action:hover .vue-ui-icon :deep(svg) {
  fill: var(--active-color);
}

.time {
  font-size: 11px;
  color: #999;
  margin-top: 3px;
  flex: none;
}

.label {
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  margin-right: 8px;
  flex: none;
  &.active {
    background-color: #2c7d59;
  }
  &.inspected {
    color: #fff;
    background-color: #af90d5;
  }
}
</style>

<style>
.list-item {
  &.disabled {
    cursor: not-allowed;
  }
}
</style>
