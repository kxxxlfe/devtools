<template>
  <div
    v-if="version > currentSettingsVersion"
    class="new-tag"
  >
    New
  </div>
</template>

<script>
export default {
  inject: [
    'currentSettingsVersion'
  ],

  props: {
    version: {
      type: Number,
      required: true
    }
  }
}
</script>

<style scoped>
.new-tag {
  display: inline-block;
  background: var(--vue-ui-color-info);
  color: var(--vue-ui-color-light);
  font-size: 9px;
  font-weight: bold;
  text-transform: uppercase;
  padding: 1px 3px;
  border-radius: var(--br);
}
</style>
