<template>
  <scroll-pane>
    <action-header slot="header">
      <div class="search">
        <VueIcon icon="search" />
        <input v-model.trim="filter" placeholder="Filter inspected state" />
      </div>
      <VueTypeAhead
        :value="inspectedModule"
        :suggestions="moduleSuggestions"
        icon-right="filter_list"
        placeholder="(Root)"
        show-all
        restrict-choice
        @update="value => setInspectedModule(value)"
      />
      <a v-tooltip="'Export Vuex State'" class="button export" @click="copyStateToClipboard">
        <VueIcon icon="content_copy" />
        <span>Export</span>
        <transition name="slide-up">
          <span v-show="showStateCopiedMessage" class="message">(Copied to clipboard!)</span>
        </transition>
      </a>
      <VuexImportState />
    </action-header>
    <div
      slot="scroll"
      class="vuex-state-inspector"
      :class="{
        pointer: isOnlyMutationPayload,
      }"
      @click="isOnlyMutationPayload && loadState()"
    >
      <state-inspector :state="filteredState" :dim-after="isOnlyMutationPayload ? 1 : -1" @edit="editVuex" />
    </div>
    <div v-if="$shared.snapshotLoading" slot="footer" class="state-info loading-vuex-state">
      <div class="label">Loading state...</div>

      <VueLoadingIndicator />
    </div>
    <div v-else-if="isOnlyMutationPayload" slot="footer" class="state-info recording-vuex-state">
      <div class="label">
        <VueIcon class="medium" icon="cached" />
        <span>Recording state on-demand...</span>
        <span v-if="lastReceivedState" class="note">displaying last received state</span>
      </div>

      <div>
        <VueButton data-id="load-vuex-state" icon-left="arrow_forward" class="accent flat" @click="loadStateNow()">
          Load state
        </VueButton>
      </div>
    </div>
  </scroll-pane>
</template>

<script>
import { getCurrentInstance, watch } from 'vue'
import { debounce, groupBy } from 'lodash-es'
import { mapState, mapGetters, mapActions, mapMutations } from 'vuex'

import { bridge as exBridge, api, eventBus } from '@front/bridge'
import ScrollPane from '@front/components/ScrollPane.vue'
import ActionHeader from '@front/components/ActionHeader.vue'
import StateInspector from '@front/components/StateInspector.vue'
import VuexImportState from './components/VuexImportState.vue'

import { searchDeepInObject, sortByKey, parse, copyToClipboard } from '@utils/util'
import { mutationBuffer } from './module'
import { useVuex } from './useVuex'
import { useSharedData } from '@utils/shared-data'

export default {
  components: {
    ScrollPane,
    ActionHeader,
    StateInspector,
    VuexImportState,
  },

  provide() {
    return {
      InspectorInjection: this.injection,
    }
  },

  setup(props, { emit }) {
    const ctx = getCurrentInstance()?.proxy
    const { sharedData } = useSharedData()

    const { hasVuex, lastReceivedState, loadInspectedState } = useVuex()
    watch(
      () => hasVuex.value,
      function (n, o) {
        if (n && !o) {
          if (sharedData.value.vuexAutoload) {
            ctx.loadState()
          }
        }
      }
    )

    function editVuex({ path, field, ...args }) {
      const rootName = path.split('.')[0]
      const rootState = ctx.filteredState.state?.find(item => item.key === rootName)

      // 只有state可以修改
      if (!rootState) {
        return
      }

      ctx.$store.dispatch('vuex/editState', {
        path,
        args,
      })
    }
    return { editVuex, lastReceivedState, loadInspectedState }
  },

  data() {
    return {
      showStateCopiedMessage: false,
      filter: '',
      injection: {
        editable: false,
      },
    }
  },

  computed: {
    ...mapState('vuex', ['activeIndex', 'inspectedIndex', 'inspectedModule', 'history']),

    ...mapGetters('vuex', ['inspectedState', 'inspectedLastState', 'filteredHistory', 'inspectedEntry', 'modules']),

    filteredState() {
      const inspectedState =
        this.isOnlyMutationPayload && this.inspectedState.mutation ? this.inspectedLastState : this.inspectedState

      const getProcessedState = (state, type) => {
        if (!Array.isArray(state)) {
          return Object.keys(state).map(key => ({
            key,
            editable: !this.isOnlyMutationPayload && type === 'state',
            value: state[key],
          }))
        } else {
          return state
        }
      }

      const result = [].concat(
        ...Object.keys(inspectedState).map(type => {
          const state = inspectedState[type]
          let processedState

          if (type === 'mutation' && this.inspectedEntry) {
            const { options } = this.inspectedEntry
            if (options.registerModule || options.unregisterModule) {
              processedState = getProcessedState(state.payload, type)
              type = options.registerModule ? 'register module' : 'unregister module'
            }
          }

          if (!processedState) {
            processedState = getProcessedState(state, type)
          }

          return processedState.map(item => ({
            type,
            ...item,
          }))
        })
      )

      return groupBy(
        sortByKey(
          result.filter(el =>
            searchDeepInObject(
              {
                [el.key]: el.value,
              },
              this.filter
            )
          )
        ),
        'type'
      )
    },

    isOnlyMutationPayload() {
      return (
        (Object.keys(this.inspectedState).length === 1 && !!this.inspectedState.mutation) ||
        Object.keys(this.inspectedState).length < 1
      )
    },

    isActive() {
      return this.activeIndex === this.inspectedIndex
    },

    moduleSuggestions() {
      return [{ value: null, label: '(Root)' }, ...this.modules.map(m => ({ value: m }))]
    },
  },

  watch: {
    isActive: {
      handler(value) {
        this.injection.editable = value
      },
      immediate: true,
    },
  },

  created() {
    this.loadStateDebounce = 300
  },

  mounted() {
    eventBus.$on('onVuexMutation', this.onMutation)
    if (this.isOnlyMutationPayload && this.$shared.vuexAutoload) {
      this.loadState()
    }
  },

  destroyed() {
    eventBus.$off('onVuexMutation', this.onMutation)
  },

  methods: {
    ...mapMutations('vuex', {
      setInspectedModule: 'INSPECTED_MODULE',
    }),

    ...mapActions('vuex', ['inspect']),

    copyStateToClipboard() {
      copyToClipboard(this.inspectedState.state)
      this.showStateCopiedMessage = true
      window.setTimeout(() => {
        this.showStateCopiedMessage = false
      }, 2000)
    },

    loadState() {
      // Debouncing
      clearTimeout(this.loadStateTimer)
      this.loadStateTimer = setTimeout(() => {
        this.loadStateNow()
      }, this.loadStateDebounce)

      // Increase debounce delay
      this.loadStateDebounce += 600
      if (this.loadStateDebounce > 2000) {
        this.loadStateDebounce = 2000
      }

      // Reset debounce delay after a period of inactivity
      clearTimeout(this.loadStateDebounceResetTimer)
      this.loadStateDebounceResetTimer = setTimeout(() => {
        this.loadStateDebounce = 300
      }, 3000)
    },

    loadStateNow() {
      const history = this.filteredHistory
      this.inspect(history[history.length - 1])
    },

    onMutation() {
      if (this.$shared.vuexAutoload) {
        if (this.unwatchHistoryLength) this.unwatchHistoryLength()
        if (mutationBuffer.length) {
          // Wait for history to receive mutations batch
          this.unwatchHistoryLength = this.$watch(
            () => this.history.length,
            (value, oldValue) => {
              this.unwatchHistoryLength()
              if (!mutationBuffer.length) {
                this.loadState()
              }
            }
          )
        } else {
          this.loadState()
        }
      }
    },
  },
}
</script>

<style lang="stylus" scoped>
.state-info
  display flex
  align-items center
  padding 2px 2px 2px 14px
  min-height 36px
  font-size 14px

  .label
    flex 1
    display flex
    align-items center
    color $blueishGrey

    .vue-ui-icon
      margin-right 8px
      >>> svg
        fill @color

  .note
    opacity .7
    margin-left 4px

.loading-vuex-state
  padding-right 14px

.pointer
  cursor pointer

.message
  margin-left 5px
  transition all .3s ease
  color $blue

.invalid-json
  right 20px
  left initial
  top 1px
  font-size 12px
  color $red
  background-color $background-color
  .vue-ui-dark-mode &
    background-color $dark-background-color
</style>
