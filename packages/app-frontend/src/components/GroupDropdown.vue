<template>
  <div
    class="group-dropdown"
    :tabindex="isOpen ? -1 : 0"
    :class="{
      'selected': isValueInOptions
    }"
    @mouseenter="$emit('update', true)"
    @mouseleave="$emit('update', false)"
    @focus="$emit('update', true)"
  >
    <div
      class="header"
      @click="selectDefault"
    >
      <slot name="header" />
    </div>

    <div
      v-show="isOpen"
      class="group-dropdown-options"
    >
      <template v-for="option of options">
        <slot
          :ref="option.name"
          name="option"
          :option="option"
        />
      </template>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },

    options: {
      type: Array,
      required: true
    },

    value: {
      type: String,
      required: true
    }
  },

  computed: {
    isValueInOptions () {
      return this.options.find(
        option => option.name === this.value
      )
    }
  },

  watch: {
    isOpen (isOpen) {
      if (isOpen) {
        window.addEventListener('click', this.outsideClickHandler)
      } else {
        window.removeEventListener('click', this.outsideClickHandler)
      }
    }
  },

  methods: {
    outsideClickHandler ($event) {
      if (!this.$el.contains($event.target)) {
        this.$emit('update', false)
      }
    },

    selectDefault () {
      // Select next
      let i = this.options.findIndex(
        o => o.name === this.value
      )
      if (i === -1) {
        i = 0
      } else {
        i++
        if (i === this.options.length) {
          i = 0
        }
      }

      this.$emit('select', this.options[i].name)
      this.$el.blur()
    }
  }
}
</script>

<style scoped>
.group-dropdown {
  position: relative;
  z-index: 100;
  &:focus {
    outline: none;
    .vue-ui-dark-mode & {
      background: #28394a;
    }
  }
  .header {
    display: flex;
    align-items: center;
    padding: 0 14px;
    height: 100%;
    cursor: pointer;
    @media (min-width: 1101px) {
      .left-icon {
        margin-right: 6px;
      }
      .right-icon {
        margin-left: 6px;
      }
    }
    @media (max-width: 1100px) {
      padding: 0 6px 0 12px;
    }
  }
}

.group-dropdown :deep(svg) {
  fill: #2c3e50;
}

.group-dropdown-options {
  position: absolute;
  background: white;
  left: 0;
  top: 100%;
  width: 100%;
  box-shadow: 0 3px 6px rgba(0,0,0,0.15);
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
  .vue-ui-dark-mode & {
    background: #222f3d;
  }
}
</style>
