import { watch } from 'vue'
import SharedData from '@utils/shared-data'
import { bridge as exBridge, api } from '../bridge'
import { getHook } from '../utils'
import { engine } from '../engine'

let frames = 0
let frameTime: number
let secondsTimer: ReturnType<typeof setInterval> | undefined

let componentMetrics: Record<string, ComponentMetric>

interface ComponentMetric {
  id: string
  hooks: Record<string, { count: number; totalTime: number }>
  totalTime: number
}

const pendingStarts = new Map<string, number>()

export function initPerfVue3Backend() {
  const hook = getHook()

  hook.on('perf:start', (_app: any, uid: number, component: any, type: string, time: number) => {
    if (!SharedData.recordPerf) return
    pendingStarts.set(`${uid}:${type}`, time)
  })

  hook.on('perf:end', (_app: any, uid: number, component: any, type: string, time: number) => {
    if (!SharedData.recordPerf) return
    const key = `${uid}:${type}`
    const startTime = pendingStarts.get(key)
    if (startTime === undefined) return
    pendingStarts.delete(key)
    addComponentMetric(component, type, startTime, time)
  })

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

function startRecording() {
  frames = 0
  frameTime = performance.now()
  secondsTimer = setInterval(frameInterval, 500)
  componentMetrics = {}
  pendingStarts.clear()
  requestAnimationFrame(frame)
}

function stopRecording() {
  clearInterval(secondsTimer)
}

function frame() {
  frames++
  if (SharedData.recordPerf) {
    requestAnimationFrame(frame)
  }
}

function frameInterval() {
  const metric = {
    type: 'fps',
    time: Date.now(),
    start: frameTime,
    end: (frameTime = performance.now()),
    value: 0,
  }
  metric.value = Math.round((frames / (metric.end - metric.start)) * 1000)
  frames = 0
  exBridge.send(api.devtool.perf.addMetric, metric)
}

function addComponentMetric(component: any, type: string, start: number, end: number) {
  const duration = end - start
  const name = engine.getInstanceName(component)

  const metric = (componentMetrics[name] = componentMetrics[name] || {
    id: name,
    hooks: {},
    totalTime: 0,
  })

  const hookEntry = (metric.hooks[type] = metric.hooks[type] || {
    count: 0,
    totalTime: 0,
  })
  hookEntry.count++
  hookEntry.totalTime += duration

  metric.totalTime += duration

  exBridge.send(api.devtool.perf.upsertMetric, { type: 'componentRender', data: metric })
}
