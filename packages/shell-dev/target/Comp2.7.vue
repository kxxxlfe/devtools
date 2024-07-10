<template>
  <div class="comp-2_7" ref="rootEl">
    <h1>comp 2.7</h1>
    <button @click="handleAdd">add</button>
    <p>count: {{ count }}</p>
    <p>computed: {{ computeCount }}</p>
  </div>
</template>

<script>
import { defineComponent, reactive, computed, ref, toRefs } from 'vue'

export default defineComponent({
  name: 'comp2.7',
  components: {},

  setup(props, { emit }) {
    const state = reactive({
      count: 0,
    })

    const computeCount = computed(() => {
      return state.count * state.count
    })

    const handleAdd = function() {
      state.count++
    }
    const rootEl = ref(null)
    return { ...toRefs(state), computeCount, handleAdd, rootEl }
  },
})
</script>

<style>
.comp-2_7 {
  background: #ccc;
}
</style>
