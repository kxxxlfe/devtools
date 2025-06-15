import { Plat } from '@yuhufe/browser-bridge'

export const PLATFORM = {
  web: 'vueDevtoolsWeb',
  devtool: Plat.devtool,
  back: Plat.background,
}

export const api = {
  web: {
    flush: `${PLATFORM.web}/flush`,
    startComponentSelector: `${PLATFORM.web}/start-component-selector`,
    stopComponentSelector: `${PLATFORM.web}/stop-component-selector`,
    selectInstance: `${PLATFORM.web}/select-instance`,
    fetchInstance: `${PLATFORM.web}/fetch-instance`,
    enterInstance: `${PLATFORM.web}/enter-instance`,
    leaveInstance: `${PLATFORM.web}/leave-instance`,
    scrollToInstance: `${PLATFORM.web}/scroll-to-instance`,
    setInstanceData: `${PLATFORM.web}/set-instance-data`,
    filterInstance: `${PLATFORM.web}/filter-data`,
    refresh: `${PLATFORM.web}/refresh`,
    pinia: {
      select: `${PLATFORM.web}/pinia/select`,
      editState: `${PLATFORM.web}/pinia/editState`,
    },
    shared: {
      ready: `${PLATFORM.web}/shared-data:ready`,
      loadComplete: `${PLATFORM.web}/shared-data:load-complete`,
      setData: `${PLATFORM.web}/shared-data:set`,
    },
  },
  devtool: {
    flush: `${PLATFORM.devtool}/flush`,
    updateInstance: `${PLATFORM.devtool}/update-instance`,
    inspectInstance: `${PLATFORM.devtool}/inspect-instance`,
    perf: {
      addMetric: `${PLATFORM.devtool}/perf/add-metric`,
      upsertMetric: `${PLATFORM.devtool}/perf/upsert-metric`,
    },
    pinia: {
      init: `${PLATFORM.devtool}/pinia/init`,
      updateState: `${PLATFORM.devtool}/pinia/updateState`,
    },
    shared: {
      init: `${PLATFORM.devtool}/shared-data:init`,
      setData: `${PLATFORM.devtool}/shared-data:set`,
    },
  },
  events: {
    toggleRecording: `${PLATFORM.web}/events/toggleRecording`,
    reset: `${PLATFORM.devtool}/events/reset`,
    triggered: `${PLATFORM.devtool}/events/triggered`,
  },
  back: {
    vueDetectResult: `${PLATFORM.back}/vueDetectResult`, // vue检测完成
  },
}
