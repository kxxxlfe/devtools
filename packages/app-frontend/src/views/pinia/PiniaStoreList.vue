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
import { computed } from 'vue'
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

    return { currStoreKey, stores, isInspected, highDensity, recordPinia, toggleRecording, storeList, inspect }
  },

  methods: {},
}
</script>

<style lang="stylus" scoped>
$inspected_color = #af90d5

.vue-recycle-scroller
  height 100%
.history
  width 100%

.entry
  font-family Menlo, Consolas, monospace
  cursor pointer
  padding 7px 20px
  font-size 12px
  box-shadow inset 0 1px 0px rgba(0, 0, 0, .08)
  min-height 34px
  transition padding-top .15s, padding-bottom .15s, min-height .15s
  &,
  .entry-info
    display flex
  .entry-info
    flex 100% 1 1
    overflow hidden
  &.active
    .time
      color lighten($active-color, 75%)
    .action
      color lighten($active-color, 75%)
      .vue-ui-icon >>> svg
        fill  lighten($active-color, 75%)
      &:hover
        color lighten($active-color, 95%)
        .vue-ui-icon >>> svg
          fill  lighten($active-color, 95%)
    .label.inspected
      background-color darken($inspected_color, 10%)
  &.special
    .mutation-type
      font-style italic
      opacity .75
  @media (max-width: $wide)
    .label
      display none
    &.inspected
      border-left 4px solid darken($inspected_color, 15%)
      padding-left 16px
  .vue-ui-icon, span, a
    display inline-block
    vertical-align middle
  .mutation-type
    line-height 20px
    overflow hidden
    white-space nowrap
    text-overflow ellipsis
    flex auto 0 1
    margin-right 4px
  .entry-actions
    display none
    flex none
    padding-right 12px
  &:hover
    .entry-actions
      display inline-block
  .vue-ui-dark-mode &
    &.active
      .mutation-type
        color #fff
  .high-density &
    padding 1px 20px
    min-height 22px

.action
  color #999
  font-size 11px
  display inline-block
  vertical-align middle
  margin-left 10px
  white-space nowrap
  span
    display none
    @media (min-width: 1400px)
      display inline
  .vue-ui-icon
    width 18px
    height @width
    margin-right 2px
  &:hover
    color $active-color
    .vue-ui-icon >>> svg
      fill $active-color

.time
  font-size 11px
  color #999
  margin-top 3px
  flex none

.label
  font-size 10px
  padding 4px 8px
  border-radius 6px
  margin-right 8px
  flex none
  &.active
    background-color darken($active-color, 25%)
  &.inspected
    color #fff
    background-color $inspected_color
</style>

<style>
.list-item {
  &.disabled {
    cursor: not-allowed;
  }
}
</style>
