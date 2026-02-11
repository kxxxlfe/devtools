<template>
  <scroll-pane>
    <action-header slot="header">
      <div v-tooltip="$t('VuexHistory.filter.tooltip')" class="search">
        <VueIcon icon="search" />
        <input
          ref="filterMutations"
          v-model.trim="filter"
          :class="{ invalid: filterRegexInvalid }"
          placeholder="Filter mutations"
        />
      </div>
      <a
        v-tooltip="$t('VuexHistory.commitAll.tooltip')"
        :class="{ disabled: !history.length }"
        class="button commit-all"
        @click="commitAll"
      >
        <VueIcon icon="get_app" />
        <span>Commit All</span>
      </a>
      <a
        v-tooltip="$t('VuexHistory.revertAll.tooltip')"
        :class="{ disabled: !history.length }"
        class="button reset"
        @click="revertAll"
      >
        <VueIcon class="small" icon="do_not_disturb" />
        <span>Revert All</span>
      </a>
      <a
        v-tooltip="$t(`VuexHistory.${sharedData.recordVuex ? 'stopRecording' : 'startRecording'}.tooltip`)"
        class="button toggle-recording"
        @click="toggleRecording"
      >
        <VueIcon :class="{ enabled: sharedData.recordVuex }" class="small" icon="lens" />
        <span>{{ sharedData.recordVuex ? 'Recording' : 'Paused' }}</span>
      </a>
    </action-header>
    <RecycleScroller
      slot="scroll"
      :items="filter ? filteredHistory : [{ id: -1 }].concat(filteredHistory)"
      :item-size="highDensity ? 22 : 34"
      class="history"
      :class="{
        'high-density': highDensity,
      }"
    >
      <template slot-scope="{ item: entry, index, active }">
        <div
          v-if="!entry.mutation"
          :data-active="active"
          :data-index="index"
          :class="{ active: activeIndex === -1, inspected: inspectedIndex === -1 }"
          class="entry list-item special"
          @click="inspect(null)"
        >
          <span class="entry-info">
            <span class="mutation-type">Base State</span>
            <span class="entry-actions">
              <a
                v-tooltip="'Time Travel to This State'"
                class="action action-time-travel"
                @click.stop="timeTravelTo(null)"
              >
                <VueIcon class="medium" icon="restore" />
                <span>Time Travel</span>
              </a>
            </span>
          </span>
          <span v-if="activeIndex === -1" class="label active">active</span>
          <span v-if="inspectedIndex === -1" class="label inspected">inspected</span>
          <span class="time">
            {{ lastCommit | formatTime(sharedData.timeFormat) }}
          </span>
        </div>
        <div
          v-else
          :data-active="active"
          :data-index="index"
          :class="{
            inspected: isInspected(index, entry),
            active: isActive(index, entry),
            special: isSpecial(entry),
          }"
          class="entry list-item"
          @click="inspect(entry)"
        >
          <span class="entry-info">
            <span class="mutation-type">{{ entry.mutation.type }}</span>
            <span class="entry-actions">
              <a
                v-tooltip="'Commit This Mutation'"
                class="action action-commit"
                @click="
                  commit(entry)
                  $event.stopImmediatePropagation()
                "
              >
                <VueIcon class="medium" icon="get_app" />
                <span>Commit</span>
              </a>
              <a
                v-tooltip="'Revert This Mutation'"
                class="action action-revert"
                @click="
                  revert(entry)
                  $event.stopImmediatePropagation()
                "
              >
                <VueIcon class="small" icon="do_not_disturb" />
                <span>Revert</span>
              </a>
              <a
                v-if="!isActive(index, entry)"
                v-tooltip="'Time Travel to This State'"
                class="action action-time-travel"
                @click="timeTravelTo(entry)"
              >
                <VueIcon class="medium" icon="restore" />
                <span>Time Travel</span>
              </a>
            </span>
          </span>
          <span v-if="isActive(index, entry)" class="label active">active</span>
          <span v-if="isInspected(index, entry)" class="label inspected">inspected</span>
          <span v-tooltip="entry.timestamp" class="time">
            {{ entry.timestamp | formatTime(sharedData.timeFormat) }}
          </span>
        </div>
      </template>
    </RecycleScroller>
  </scroll-pane>
</template>

<script>
import { computed, getCurrentInstance } from 'vue'
import ScrollPane from '@front/components/ScrollPane.vue'
import ActionHeader from '@front/components/ActionHeader.vue'

import Keyboard, { UP, DOWN, DEL, BACKSPACE, ENTER } from '@front/mixins/keyboard'
import EntryList from '@front/mixins/entry-list'
import { useSharedData } from '@utils/shared-data'
import { focusInput } from '@utils/util'
import { useVuex } from './useVuex'

export default {
  components: {
    ActionHeader,
    ScrollPane,
  },

  setup(props, { emit }) {
    const { sharedData, updateSharedData } = useSharedData()
    const {
      state: vuexState,
      filteredHistory,
      inspect,
      commitAll,
      revertAll,
      commit,
      revert,
      timeTravelTo,
      updateFilter,
    } = useVuex()

    const highDensity = computed(() => {
      const pref = sharedData.value.displayDensity
      return (pref === 'auto' && filteredHistory.value.length > 7) || pref === 'high'
    })

    function toggleRecording() {
      updateSharedData({
        recordVuex: !sharedData.value.recordVuex,
      })
    }

    const filter = computed({
      get: () => vuexState.filter,
      set: (value) => {
        updateFilter(value)
        inspect(value ? -1 : vuexState.history.length - 1)
      },
    })

    return {
      sharedData,
      highDensity,
      toggleRecording,
      // State
      history: computed(() => vuexState.history),
      lastCommit: computed(() => vuexState.lastCommit),
      inspectedIndex: computed(() => vuexState.inspectedIndex),
      activeIndex: computed(() => vuexState.activeIndex),
      filterRegex: computed(() => vuexState.filterRegex),
      filterRegexInvalid: computed(() => vuexState.filterRegexInvalid),
      filter,
      // Getters
      filteredHistory,
      // Actions
      commitAll,
      revertAll,
      commit,
      revert,
      inspect,
      timeTravelTo,
      updateFilter,
    }
  },

  mixins: [
    Keyboard({
      onKeyDown({ key, modifiers }) {
        switch (modifiers) {
          case 'ctrl':
            if (key === ENTER) {
              this.commitAll()
              return false
            } else if (key === DEL || key === BACKSPACE) {
              this.revertAll()
              return false
            } else if (key === 'f') {
              focusInput(this.$refs.filterMutations)
              return false
            }
            break
          case '':
            if (key === UP) {
              this.inspect(this.inspectedIndex - 1)
              return false
            } else if (key === DOWN) {
              this.inspect(this.inspectedIndex + 1)
              return false
            } else if (key === 'r') {
              this.toggleRecording()
            }
        }
      },
    }),
    EntryList({
      indexOffset: 1,
    }),
  ],

  methods: {
    isActive(index, entry) {
      return this.activeIndex === index - (this.filter ? 0 : 1)
    },

    isInspected(index, entry) {
      return this.inspectedIndex === index - (this.filter ? 0 : 1)
    },

    isSpecial(entry) {
      return entry.options.registerModule || entry.options.unregisterModule
    },
  },
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
