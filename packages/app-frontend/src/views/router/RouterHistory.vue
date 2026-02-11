<template>
  <scroll-pane scroll-event="routes:init">
    <action-header slot="header">
      <div class="search">
        <VueIcon icon="search" />
        <input ref="filterRoutes" v-model.trim="filter" placeholder="Filter routes" />
      </div>
      <a :class="{ disabled: !filteredRoutes.length }" class="button reset" @click="reset">
        <VueIcon class="small" icon="do_not_disturb" />
        <span>Clear</span>
      </a>
      <a class="button toggle-recording" @click="toggleRecording">
        <VueIcon :class="{ enabled: recordRouter }" class="small" icon="lens" />
        <span>{{ recordRouter ? 'Recording' : 'Paused' }}</span>
      </a>
    </action-header>
    <RecycleScroller
      slot="scroll"
      :items="filteredRoutes"
      :item-size="highDensity ? 22 : 34"
      class="history"
      :class="{
        'high-density': highDensity,
      }"
    >
      <div v-if="filteredRoutes.length === 0" slot="after-container" class="no-routes">
        No route transitions found
        <span v-if="!recordRouter">
          <br />
          (Recording is paused)
        </span>
      </div>

      <template slot-scope="{ item: route, index, active }">
        <div
          class="entry list-item"
          :class="{ active: inspectedIndex === index }"
          :data-active="active"
          @click="inspect(routeChanges.indexOf(route))"
        >
          <span class="route-name">{{ route.to.path }}</span>
          <span class="time">{{ route.timestamp | formatTime($shared.timeFormat) }}</span>
          <span v-if="route.to.redirectedFrom" class="label redirect">redirect</span>
          <span v-if="isNotEmpty(route.to.name)" class="label name">
            {{ route.to.name }}
          </span>
        </div>
      </template>
    </RecycleScroller>
  </scroll-pane>
</template>

<script>
import { UNDEFINED } from '@utils/util'
import ScrollPane from '@front/components/ScrollPane.vue'
import ActionHeader from '@front/components/ActionHeader.vue'

import { useRouter } from './useRouter'

export default {
  components: {
    ScrollPane,
    ActionHeader,
  },
  setup(props, { emit }) {
    const {
      toggleRecording, recordRouter,
      routeChanges, inspectedIndex, filter,
      filteredRoutes,
      inspect, reset,
    } = useRouter()

    return {
      toggleRecording, recordRouter,
      routeChanges, inspectedIndex, filter,
      filteredRoutes,
      inspect, reset,
    }
  },
  computed: {
    highDensity() {
      const pref = this.$shared.displayDensity
      return (pref === 'auto' && this.totalCount > 12) || pref === 'high'
    },
  },
  methods: {
    isNotEmpty(value) {
      return !!value && value !== UNDEFINED
    },
  },
}
</script>

<style scoped>
.vue-recycle-scroller {
  width: 100%;
  height: 100%;
}
</style>

<style scoped>
.no-routes {
  color: #ccc;
  text-align: center;
  margin-top: 50px;
  line-height: 30px;
}

.entry {
  font-family: Menlo, Consolas, monospace;
  cursor: pointer;
  padding: 7px 20px;
  font-size: 12px;
  line-height: 20px;
  box-shadow: inset 0 1px 0px rgba(0, 0, 0, .08);
  min-height: 34px;
  transition: padding .15s, min-height .15s;

  &::after {
    content: '';
    display: table;
    clear: both;
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
  }
  .high-density & {
    padding: 1px 20px;
    min-height: 22px;
  }
  span {
    display: inline-block;
    vertical-align: middle;
  }
}

.entry.active .action .vue-ui-icon :deep(svg) {
  fill: #cbecdd;
}

.entry.active .action:hover .vue-ui-icon :deep(svg) {
  fill: #f5fbf8;
}

.route-name {
  font-weight: 600;
}

.time {
  font-size: 11px;
  color: #999;
  float: right;
}

.label {
  float: right;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  margin-right: 8px;
  margin-top: 1px;
  line-height: 1;
  color: #fff;
  &.name {
    background-color: var(--purple);
  }
  &.alias {
    background-color: var(--orange);
  }
  &.redirect {
    background-color: var(--darkerGrey);
  }
}
</style>
