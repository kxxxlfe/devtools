import { ref, reactive, computed, toRefs } from 'vue'
import * as storage from '@utils/storage'
import { getComponentDisplayName, parse } from '@utils/util'
import SharedData, { useSharedData } from '@utils/shared-data'
import { bridge as exBridge, api } from '@front/bridge'

const REGEX_RE = /^\/((?:(?:.*?)(?:\\\/)?)*?)\/(\w*)/

let uid = 0

const state = reactive({
  events: [],
  inspectedIndex: -1,
  newEventCount: 0,
  filter: '',
})

const filteredEvents = computed(() => {
  let searchText = state.filter.toLowerCase()
  const searchComponent = /<|>/g.test(searchText)
  if (searchComponent) {
    searchText = searchText.replace(/<|>/g, '')
  }
  const regExParts = state.filter.match(REGEX_RE)
  let regEx
  if (regExParts) {
    regEx = new RegExp(regExParts[1], regExParts[2])
  }
  return state.events.filter(matchingEvent({ searchText, searchComponent, regEx }))
})

const activeEvent = computed(() => {
  return filteredEvents.value[state.inspectedIndex]
})

const reset = function () {
  state.events = []
  state.inspectedIndex = -1
}

export const useEvents = function () {
  const { sharedData, updateSharedData } = useSharedData()
  const inspect = index => {
    if (index < 0) index = 0
    if (index >= filteredEvents.value.length) index = filteredEvents.value.length - 1
    state.inspectedIndex = index
  }

  const resetNewEventCount = function () {
    state.newEventCount = 0
  }

  const updateFilter = function (filter) {
    state.filter = filter
  }

  const enabled = computed(() => sharedData.value.recordEvent)
  const toggle = function () {
    updateSharedData({ recordEvent: !enabled.value })
  }

  return {
    ...toRefs(state),
    inspect,
    toggle,
    enabled,
    reset,
    updateFilter,
    filteredEvents,
    activeEvent,
    resetNewEventCount,
  }
}

const matchingEvent =
  ({ searchText, searchComponent, regEx }) =>
  e => {
    const componentNameStyle = SharedData.componentNameStyle
    let searchTerm = searchComponent ? getComponentDisplayName(e.instanceName, componentNameStyle) : e.eventName

    if (regEx) {
      try {
        return regEx.test(searchTerm)
      } catch (e) {
        return searchTerm.toLowerCase().indexOf(searchText) > -1
      }
    }

    return searchTerm.toLowerCase().indexOf(searchText) > -1
  }

exBridge.on(api.events.triggered, payload => {
  const newEvt = parse(payload)
  newEvt.id = uid++
  state.events.push(newEvt)
  if (!state.filter) {
    state.inspectedIndex = state.events.length - 1
  }
  if (router.currentRoute.name !== 'events') {
    state.newEventCount++
  }
})
exBridge.on(api.events.reset, () => {
  reset()
})
