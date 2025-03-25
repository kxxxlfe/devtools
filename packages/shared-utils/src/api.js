import { Plat } from '@yuhufe/browser-bridge'

export const PLATFORM = {
  web: 'vueDevtoolsWeb',
  devtool: Plat.devtool,
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
      select: `${PLATFORM.devtool}/pinia/select`,
      editState: `${PLATFORM.devtool}/pinia/editState`,
      updateState: `${PLATFORM.devtool}/pinia/updateState`,
    },
  },
}
