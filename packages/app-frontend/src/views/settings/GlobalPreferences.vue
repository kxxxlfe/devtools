<template>
  <div class="global-preferences preferences">
    <VueFormField title="Normalize component names">
      <VueGroup v-model="sharedData.componentNameStyle" class="extend">
        <VueGroupButton value="original" label="Original name" />
        <VueGroupButton value="class" label="Pascal case" />
        <VueGroupButton value="kebab" label="Kebab case" />
      </VueGroup>
    </VueFormField>

    <VueFormField title="Theme">
      <VueGroup v-model="sharedData.theme" class="extend">
        <VueGroupButton value="auto" label="Auto" />
        <VueGroupButton value="light" label="Light" />
        <VueGroupButton value="dark" label="Dark" />
        <VueGroupButton value="high-contrast" label="High contrast" />
      </VueGroup>
    </VueFormField>

    <VueFormField title="Display density">
      <VueGroup v-model="sharedData.displayDensity" class="extend">
        <VueGroupButton value="auto" label="Auto" />
        <VueGroupButton value="low" label="Low" />
        <VueGroupButton value="high" label="High" />
      </VueGroup>
    </VueFormField>

    <VueFormField title="Editable props">
      <VueSwitch v-model="sharedData.editableProps">Enable</VueSwitch>
      <template #subtitle>
        <VueIcon icon="warning" class="medium" />
        May print warnings in the console
      </template>
    </VueFormField>

    <VueFormField title="Time Format">
      <VueSwitch
        :value="sharedData.timeFormat === 'ms'"
        @update="value => (sharedData.timeFormat = value ? 'ms' : 'default')"
      >
        Display milliseconds
      </VueSwitch>
    </VueFormField>

    <VueFormField title="Detected Vue message">
      <VueSwitch v-model="sharedData.logDetected">Display in browser console</VueSwitch>
    </VueFormField>

    <VueFormField>
      <template #title>
        New Vuex backend
        <NewTag :version="2" />
      </template>
      <VueSwitch v-model="sharedData.vuexNewBackend">Enable</VueSwitch>
      <template #subtitle>Faster and less memory-intensive</template>
    </VueFormField>

    <VueFormField title="Autoload Vuex state">
      <VueSwitch v-model="sharedData.vuexAutoload">Enable</VueSwitch>
      <template #subtitle>
        <VueIcon icon="warning" class="medium" />
        May impact performance or cause crashes
      </template>
    </VueFormField>

    <VueFormField>
      <template #title>
        Group getters by module
        <NewTag :version="2" />
      </template>
      <VueSwitch v-model="sharedData.vuexGroupGettersByModule">Enable</VueSwitch>
    </VueFormField>
  </div>
</template>

<script>
import NewTag from './NewTag.vue'
import { useSharedData } from '@utils/shared-data'

export default {
  components: {
    NewTag,
  },
  setup(props, { emit }) {
    const { sharedData } = useSharedData()

    return { sharedData }
  },
}
</script>
