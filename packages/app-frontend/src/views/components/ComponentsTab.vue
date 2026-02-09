<template>
  <div>
    <split-pane>
      <component-tree v-if="defer(2)" slot="left" :instances="instances" />
      <component-inspector v-if="defer(3)" slot="right" :key="inspectedId" />
    </split-pane>
  </div>
</template>

<script>
import Defer from '@front/mixins/defer'

import SplitPane from '@front/components/SplitPane.vue'
import ComponentTree from './ComponentTree.vue'
import ComponentInspector from './ComponentInspector.vue'
import { useComponent } from './useComponent'
import { useComponentTree } from './module'

const superDef = {
  data() {
    return {
      foo: 'bar',
    }
  },
}

export default {
  components: {
    ComponentTree,
    ComponentInspector,
    SplitPane,
  },

  setup(props, { emit }) {
    const { inspectedInstance, inspected } = useComponent()

    const { instances } = useComponentTree()

    return { instances, loading: inspected.loading, inspectedId: inspected.id, target: inspectedInstance }
  },

  extends: superDef,

  mixins: [Defer()],
}
</script>
