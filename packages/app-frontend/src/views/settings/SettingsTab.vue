<template>
  <div class="settings grid">
    <GlobalPreferences />
  </div>
</template>

<script>
import GlobalPreferences from './GlobalPreferences.vue'
import { mapState } from 'vuex'
import { get } from '@utils/storage'

export const SETTINGS_VERSION = 3
export const SETTINGS_VERSION_ID = 'vue-devtools-settings-version'

export default {
  components: { GlobalPreferences },

  provide () {
    return {
      settingsVersion: SETTINGS_VERSION,
      currentSettingsVersion: parseInt(get(SETTINGS_VERSION_ID)) || 0
    }
  },

  computed: mapState('events', [
    'enabled'
  ])
}
</script>

<style scoped>
.settings {
  overflow: auto !important;
}

.settings :deep(.preferences) {
  display: flex;
  flex-wrap: wrap;
  padding: 12px 4px;
}

.settings :deep(.preferences > *) {
  flex-basis: 380px;
  margin: 16px 24px;
}

.settings :deep(.preferences .vue-ui-form-field > .wrapper > .content) {
  min-height: 32px;
  justify-content: center;
}
</style>
