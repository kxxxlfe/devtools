import { Plat } from '@yuhufe/browser-bridge'

// 各端对于dev环境判定不同
export const detectDev = function (platform) {
  let isDev = false
  if (platform === 'backend') {
    isDev = globalThis.isShellDev
  }
  if (platform === 'frontend') {
    isDev = location.protocol?.startsWith('http')
  }

  if (isDev) {
    toDev()
  }

  return isDev
}

export const PLATFORM = {
  web: 'vueDevtoolsWeb',
  devtool: Plat.devtool,
  back: Plat.background,
}

function makeAPI() {
  return {
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
      updateActiveTab: `${PLATFORM.web}/updateActiveTab`,
      pinia: {
        select: `${PLATFORM.web}/pinia/select`,
        editState: `${PLATFORM.web}/pinia/editState`,
      },
      shared: {
        ready: `${PLATFORM.web}/shared-data:ready`,
        loadComplete: `${PLATFORM.web}/shared-data:load-complete`,
        setData: `${PLATFORM.web}/shared-data:set`,
      },
      fetchVueDetect: `${PLATFORM.web}/fetchVueDetect`,
      changeDevtoolsEnable: `${PLATFORM.web}/changeDevtoolsEnable`, // force devtools enable
      inspectCtxMenuInst: `${PLATFORM.web}/inspectCtxMenuInst`, // inspect right click el
      log: `${PLATFORM.web}/console/log`,
    },
    devtool: {
      flush: `${PLATFORM.devtool}/flush`,
      updateInstance: `${PLATFORM.devtool}/update-instance`,
      inspectInstance: `${PLATFORM.devtool}/inspect-instance`, // choose node in `Components`
      stopedComponentSelector: `${PLATFORM.devtool}/stoped-component-selector`, // stoped selecting
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
      reset: `${PLATFORM.devtool}/events/reset`,
      triggered: `${PLATFORM.devtool}/events/triggered`,
    },
    router: {
      toggleRecording: `${PLATFORM.web}/router/toggleRecording`,
      init: `${PLATFORM.devtool}/router/init`,
      changed: `${PLATFORM.devtool}/router/changed`,
    },
    routes: {
      init: `${PLATFORM.devtool}/routes/init`,
      changed: `${PLATFORM.devtool}/routes/changed`,
    },
    back: {
      vueDetectResult: `${PLATFORM.back}/vueDetectResult`, // vue检测完成
    },
    vuex: {
      init: `${PLATFORM.devtool}/vuex/init`,
      inspectState: `${PLATFORM.web}/vuex/inspectState`,
      inspectedState: `${PLATFORM.devtool}/vuex/inspectedState`,
      mutation: `${PLATFORM.devtool}/vuex/mutation`,
    },
  }
}

export let api = makeAPI()

// 切换到dev数据
function toDev() {
  PLATFORM.web = `Dev_${PLATFORM.web}`
  PLATFORM.devtool = `Dev_${PLATFORM.devtool}`
  api = makeAPI()
}
