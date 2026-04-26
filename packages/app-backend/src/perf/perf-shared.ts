import SharedData from '@utils/shared-data'
import { bridge as exBridge, api } from '../bridge'
import { engine } from '../engine'

export interface ComponentMetric {
  id: string
  hooks: Record<string, { count: number; totalTime: number }>
  totalTime: number
}

export let componentMetrics: Record<string, ComponentMetric> = {}

let frames = 0
let frameTime: number
let secondsTimer: ReturnType<typeof setInterval> | undefined

export function startRecording(onStart?: () => void) {
  frames = 0
  frameTime = performance.now()
  secondsTimer = setInterval(frameInterval, 500)
  componentMetrics = {}
  onStart?.()
  requestAnimationFrame(frame)
}

export function stopRecording() {
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

export function addComponentMetric(
  instance: any,
  type: string,
  start: number,
  end: number,
  getName: (instance: any) => string = inst => engine.getInstanceName(inst)
) {
  const duration = end - start
  const name = getName(instance)

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


