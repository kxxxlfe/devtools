import { watch } from 'vue'
import SharedData from '@utils/shared-data'
import { getHook } from '../utils'
import { addComponentMetric, startRecording, stopRecording } from './perf-shared'

const pendingStarts = new Map<string, number>()

export function initPerfVue3Backend() {
  const hook = getHook()

  hook.on('perf:start', (_app: any, uid: number, _component: any, type: string, time: number) => {
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
        startRecording(() => pendingStarts.clear())
      } else {
        stopRecording()
      }
    }
  )
}
