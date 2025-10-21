<template>
  <div class="import-state-wrapper">
    <a v-tooltip="'Import Vuex State'" class="button import" @click="toggleImportStatePopup">
      <VueIcon icon="content_paste" />
      <span>Import</span>
    </a>
    <transition name="slide-down">
      <div v-if="showImportStatePopup" class="import-state">
        <textarea
          ref="textarea"
          placeholder="Paste state object here to import it..."
          @input="importState"
          @keydown.esc.stop="closeImportStatePopup"
        />
        <span v-show="showBadJSONMessage" class="message invalid-json">INVALID JSON!</span>
      </div>
    </transition>
  </div>
</template>

<script>
import { getCurrentInstance, watch, ref, nextTick } from 'vue'
import { debounce, groupBy } from 'lodash-es'

import { bridge as exBridge, api } from '@front/bridge'

import { parse } from '@utils/util'
import { useVuex } from '../useVuex'
import { useSharedData } from '@utils/shared-data'

export default {
  components: {},

  setup(props, { emit }) {
    const { loadInspectedState } = useVuex()
    const showImportStatePopup = ref(false)
    const showBadJSONMessage = ref(false)

    const textarea = ref(null)

    watch(
      () => showImportStatePopup.value,
      val => {
        if (val) {
          nextTick(() => {
            textarea.value?.focus?.()
          })
        }
      }
    )

    function toggleImportStatePopup() {
      if (showImportStatePopup.value) {
        closeImportStatePopup()
      } else {
        showImportStatePopup.value = true
      }
    }

    function closeImportStatePopup() {
      showImportStatePopup.value = false
    }

    const importState = debounce(async function (e) {
      const importedStr = e.target.value
      if (importedStr.length === 0) {
        showBadJSONMessage.value = false
      } else {
        try {
          // Try to parse here so we can provide invalid feedback
          parse(importedStr, true)
          const { index, snapshot } = await exBridge.requestChunk(api.vuex.importState, importedStr)

          loadInspectedState({ index, snapshot })
          showBadJSONMessage.value = false
        } catch (e) {
          showBadJSONMessage.value = true
        }
      }
    }, 250)

    return {
      textarea,
      showImportStatePopup,
      showBadJSONMessage,
      toggleImportStatePopup,
      closeImportStatePopup,
      importState,
    }
  },
}
</script>

<style lang="stylus" scoped>
.import-state
  transition all .2s ease
  width 300px
  position absolute
  z-index 1
  left 220px
  right 10px
  top 45px
  box-shadow 4px 4px 6px 0 $border-color
  border 1px solid $border-color
  padding 3px
  background-color $background-color
  .vue-ui-dark-mode &
    background-color $dark-background-color
    box-shadow 4px 4px 6px 0 $dark-border-color
    border 1px solid $dark-border-color
  &:after
    content 'Press ESC to close'
    position absolute
    bottom 0
    padding 5px
    color inherit
    opacity .5

  textarea
    width 100%
    height 100px
    display block
    outline none
    border none
    resize vertical
    .vue-ui-dark-mode &
      color #DDD
      background-color $dark-background-color
</style>

<style lang="css" scoped>
.import-state-wrapper {
  display: contents;
}
</style>
