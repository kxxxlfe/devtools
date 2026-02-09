<template>
  <div
    :class="{
      inactive: instance.inactive && !instance.parent.inactive,
      selected,
    }"
    class="instance"
    :style="{
      paddingLeft: 8 + 'px',
    }"
  >
    <div
      ref="self"
      :class="{
        selected,
      }"
      class="self selectable-item"
      @click.stop="select"
      @dblclick.stop="toggle"
      @mouseenter="enter"
      @mouseleave="leave"
    >
      <!-- Component tag -->
      <span class="content">
        <!-- arrow wrapper for better hit box -->
        <span v-if="instance.children.length" class="arrow-wrapper" @click.stop="toggle">
          <span :class="{ rotated: expanded }" class="arrow right" />
        </span>

        <span class="angle-bracket">&lt;</span>

        <span class="item-name">{{ displayName }}</span>

        <span v-if="componentHasKey" class="attr">
          <span class="attr-title">key</span>
          =
          <span class="attr-value">{{ instance.renderKey }}</span>
        </span>

        <span class="angle-bracket">&gt;</span>
      </span>
      <span
        v-if="instance.consoleId"
        v-tooltip="$t('ComponentInstance.consoleId.tooltip', { id: instance.consoleId })"
        class="info console"
      >
        = {{ instance.consoleId }}
      </span>
      <span v-if="instance.isRouterView" class="info router-view">
        router-view{{ instance.matchedRouteSegment ? ': ' + instance.matchedRouteSegment : null }}
      </span>
      <span v-if="instance.isFragment" class="info fragment">fragment</span>
      <span v-if="instance.functional" class="info functional">functional</span>
      <span v-if="instance.inactive" class="info inactive">inactive</span>

      <span class="spacer" />

      <VueIcon v-tooltip="'Scroll into view'" class="icon-button" icon="visibility" @click="scrollToInstance" />
    </div>

    <div v-if="expanded">
      <component-instance v-for="child in sortedChildren" :key="child.id" :instance="child" :depth="depth + 1" />
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, watch, getCurrentInstance, computed } from 'vue'
import debounce from 'lodash/debounce'
import { getComponentDisplayName, UNDEFINED } from '@utils/util'

import { bridge as exBridge, api } from '@front/bridge'
import { useComponent } from './useComponent'
import { useComponentTree } from './module'

export default defineComponent({
  name: 'ComponentInstance',

  props: {
    instance: {
      type: Object,
      required: true,
    },
    depth: {
      type: Number,
      required: true,
    },
  },

  setup(props, { emit }) {
    const self = ref(null)
    const ctx = getCurrentInstance().proxy

    const { selectInstance, inspected } = useComponent()
    const selected = computed(() => props.instance.id === inspected.id.value)
    watch(
      () => selected.value,
      function (n) {
        if (isClickInstance) {
          return
        }
        if (n) {
          self.value.scrollIntoView({ inline: 'start', block: 'center' })
        }
      }
    )

    let isClickInstance = false
    function select() {
      isClickInstance = true
      selectInstance(props.instance.id)

      setTimeout(() => {
        isClickInstance = false
      }, 3000)
    }

    function enter() {
      exBridge.send(api.web.enterInstance, props.instance.id)
    }

    function leave() {
      exBridge.send(api.web.leaveInstance, props.instance.id)
    }

    const scrollIntoView = debounce(() => {
      self.value.scrollIntoView({ inline: 'start', block: 'center' })
    }, 0)

    const { toggleInstance, scrollToExpanded, expansionMap } = useComponentTree()
    function toggleWithValue(val, recursive = false) {
      toggleInstance({
        instance: props.instance,
        expanded: val,
        recursive,
      })
    }
    // 修改了展开目标节点
    watch(
      () => scrollToExpanded.value,
      function (value, oldValue) {
        if (value !== oldValue && value === props.instance.id) {
          scrollIntoView()
        }
      }
    )

    // 展开
    const expanded = computed(() => {
      return !!expansionMap.value[props.instance.id]
    })

    return { self, selected, select, enter, leave, scrollIntoView, toggleWithValue, expanded }
  },

  computed: {
    sortedChildren() {
      return this.instance.children.slice().sort((a, b) => {
        return a.top === b.top ? a.id - b.id : a.top - b.top
      })
    },

    displayName() {
      return getComponentDisplayName(this.instance.name, this.$shared.componentNameStyle)
    },

    componentHasKey() {
      return (this.instance.renderKey === 0 || !!this.instance.renderKey) && this.instance.renderKey !== UNDEFINED
    },
  },

  created() {
    // expand root by default
    if (this.depth === 0) {
      this.expand()
    }
  },

  methods: {
    toggle(event) {
      this.toggleWithValue(!this.expanded, event.altKey)
    },

    expand() {
      this.toggleWithValue(true)
    },

    collapse() {
      this.toggleWithValue(false)
    },

    scrollToInstance() {
      exBridge.send(api.web.scrollToInstance, this.instance.id)
    },
  },
})
</script>

<style scoped>
.instance {
  font-family: dejavu sans mono, monospace;
  .platform-mac & {
    font-family: Menlo, monospace;
  }
  .platform-windows & {
    font-family: Consolas, Lucida Console, Courier New, monospace;
  }
  &.inactive {
    opacity: 0.5;
  }
}

.self {
  cursor: pointer;
  position: relative;
  overflow: hidden;
  z-index: 2;
  border-radius: 3px;
  font-size: 14px;
  line-height: 22px;
  height: 22px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  padding-right: 6px;
  transition: font-size 0.15s, height 0.15s;

  &:hidden {
    display: none;
  }

  .high-density & {
    font-size: 12px;
    height: 15px;
  }
}

.children {
  position: relative;
  z-index: 1;
}

.content {
  position: relative;
  padding-left: 22px;
}

.info {
  color: #fff;
  font-size: 10px;
  padding: 3px 5px 2px;
  display: inline-block;
  line-height: 10px;
  border-radius: 3px;
  position: relative;
  top: -1px;
  .high-density & {
    padding: 1px 4px 0;
    top: 0;
  }
  &.console {
    color: #fff;
    background-color: transparent;
    top: 0;
  }
  &.router-view {
    background-color: #ff8344;
  }
  &.fragment {
    background-color: #b3cbf7;
  }
  &.inactive {
    background-color: #aaa;
  }
  &.functional {
    background-color: rgba(0, 0, 0, 0.06);
    color: rgba(0, 0, 0, 0.5);
    .vue-ui-dark-mode & {
      background-color: rgba(255, 255, 255, 0.06);
      color: rgba(255, 255, 255, 0.5);
    }
  }
  &:not(.console) {
    margin-left: 6px;
  }
}

.arrow-wrapper {
  position: absolute;
  display: inline-block;
  width: 16px;
  height: 16px;
  top: 1px;
  left: 4px;
}

.arrow {
  position: absolute;
  top: 5px;
  left: 4px;
  transition: transform 0.1s ease;
  &.rotated {
    transform: rotate(90deg);
  }
}

.angle-bracket {
  color: var(--darkGrey);
}

.item-name {
  color: var(--component-color);
  margin: 0 1px;
}

.attr {
  opacity: 0.5;
  font-size: 12px;
  .high-density & {
    font-size: 10px;
  }
}

.attr-title {
  color: purple;
  .vue-ui-dark-mode & {
    color: #f6f;
  }
}

.spacer {
  flex: auto 1 1;
}

.icon-button {
  width: 16px;
  height: 16px;

  .self:not(:hover) & {
    visibility: hidden;
  }
}

.self.selected .icon-button :deep(svg) {
  fill: var(--white);
}

.self:not(.selected) {
  .info {
    &.console {
      color: #ccc;
      .vue-ui-dark-mode & {
        color: #4d4d4d;
      }
    }
  }
}

.self.selected {
  .attr {
    opacity: 1;
  }
  .attr-title {
    color: #e0d9ff;
  }
  .info.functional {
    color: var(--md-white);
  }
}
</style>
