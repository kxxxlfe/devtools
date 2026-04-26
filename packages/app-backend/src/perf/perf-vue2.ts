import { watch } from 'vue'
import SharedData from '@utils/shared-data'
import { instanceMap } from '../utils'
import { addComponentMetric, startRecording, stopRecording } from './perf-shared'

const COMPONENT_HOOKS = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeDestroyed',
  'destroyed',
] as const

type ComponentHook = (typeof COMPONENT_HOOKS)[number]

const RENDER_HOOKS: Partial<Record<ComponentHook, { before?: string; after?: string }>> = {
  beforeMount: { after: 'mountRender' },
  mounted: { before: 'mountRender' },
  beforeUpdate: { after: 'updateRender' },
  updated: { before: 'updateRender' },
}

export function initPerfVue2Backend(Vue: any) {
  // Global mixin
  Vue.mixin({
    beforeCreate() {
      applyHooks(this)
    },
  })

  // Apply to existing components
  instanceMap.forEach(applyHooks)

  watch(
    () => SharedData.recordPerf,
    value => {
      if (value) {
        startRecording()
      } else {
        stopRecording()
      }
    }
  )
}

function applyHooks(vm: any) {
  if (vm.$options.$_devtoolsPerfHooks) return
  vm.$options.$_devtoolsPerfHooks = true

  const renderMetrics: Record<string, { start: number; end: number }> = {}

  COMPONENT_HOOKS.forEach(hook => {
    const renderHook = RENDER_HOOKS[hook]

    const handler = function (this: any) {
      if (SharedData.recordPerf) {
        // Before
        const time = performance.now()
        if (renderHook && renderHook.before) {
          // Render hook ends before one hook
          const metric = renderMetrics[renderHook.before]
          if (metric) {
            metric.end = time
            addComponentMetric(vm, renderHook.before, metric.start, metric.end)
          }
        }

        // After
        this.$once(`hook:${hook}`, () => {
          const newTime = performance.now()
          addComponentMetric(vm, hook, time, newTime)
          if (renderHook && renderHook.after) {
            // Render hook starts after one hook
            renderMetrics[renderHook.after] = {
              start: newTime,
              end: 0,
            }
          }
        })
      }
    }

    const currentValue = vm.$options[hook]
    if (Array.isArray(currentValue)) {
      vm.$options[hook] = [handler, ...currentValue]
    } else if (typeof currentValue === 'function') {
      vm.$options[hook] = [handler, currentValue]
    } else {
      vm.$options[hook] = [handler]
    }
  })
}
