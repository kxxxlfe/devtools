<template>
  <div class="scroll-pane">
    <div class="header">
      <slot name="header" />
    </div>
    <div class="scroll">
      <slot v-if="defer(2)" name="scroll" />
    </div>
    <div v-if="$slots.footer" class="footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script>
import Defer from '@front/mixins/defer'

export default {
  mixins: [Defer()],
}
</script>

<style scoped>
.scroll-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.scroll {
  display: flex;
  flex: 1;
  overflow: auto;
}

.vue-ui-dark-mode .scroll::-webkit-scrollbar,
.vue-ui-dark-mode .scroll :deep(.vue-recycle-scroller::-webkit-scrollbar) {
  background: var(--dark-background-color);
  border-left: 1px solid var(--dark-border-color);
}

.vue-ui-dark-mode .scroll::-webkit-scrollbar-thumb,
.vue-ui-dark-mode .scroll :deep(.vue-recycle-scroller::-webkit-scrollbar-thumb) {
  background: #17212b;
  border: 1px solid #1f2d3a;
}

/* Keeping this here in case `overflow: overlay`
   doesn't float everyone's boat. */
.scroll--themed {
  &::-webkit-scrollbar {
    width: 5px;
    height: 0;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--active-color);
  }
}

.footer {
  border-top: 1px solid var(--border-color);
  .vue-ui-dark-mode & {
    border-top-color: var(--dark-border-color);
  }
}
</style>
