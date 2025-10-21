import { parse, get } from '@utils/util'
import * as actions from './actions'
import SharedData from '@utils/shared-data'
import { base, inspectedState, lastReceivedState } from './useVuex'

const ANY_RE = new RegExp('.*', 'i')

let uid = 0

export const mutationBuffer = []

const state = {
  inspectedIndex: -1,
  activeIndex: -1,
  history: [
    /* { mutation, timestamp, snapshot } */
  ],
  initialCommit: Date.now(),
  lastCommit: Date.now(),
  filter: '',
  filterRegex: ANY_RE,
  filterRegexInvalid: false,
  inspectedModule: null,
}

const mutations = {
  RECEIVE_MUTATIONS(state, entries) {
    const inspectingLastMutation = state.inspectedIndex === state.history.length - 1
    for (const entry of entries) {
      entry.id = uid++
    }
    state.history.push(...entries)
    if (!state.filter) {
      state.activeIndex = state.history.length - 1
      if (inspectingLastMutation) {
        state.inspectedIndex = state.activeIndex
        inspectedState.value = null
      }
    }
  },

  COMMIT_ALL(state) {
    base.value = lastReceivedState.value
    state.lastCommit = Date.now()
    reset(state)
  },

  REVERT_ALL(state) {
    reset(state)
  },

  COMMIT(state, index) {
    base.value = lastReceivedState.value
    state.lastCommit = Date.now()
    state.history = state.history.slice(index + 1)
    state.history.forEach(({ mutation }, index) => {
      mutation.index = index
    })
    state.inspectedIndex = -1
  },

  REVERT(state, index) {
    state.history = state.history.slice(0, index)
    state.inspectedIndex = state.history.length - 1
  },

  INSPECT(state, index) {
    state.inspectedIndex = index
  },

  TIME_TRAVEL(state, index) {
    state.activeIndex = index
  },

  UPDATE_FILTER(state, filter) {
    state.filter = filter
    const regexParts = filter.match(/^\/((?:(?:.*?)(?:\\\/)?)*?)\/(\w*)/)
    if (regexParts !== null) {
      // looks like it might be a regex -> try to compile it
      try {
        state.filterRegexInvalid = false
        state.filterRegex = new RegExp(regexParts[1], regexParts[2])
      } catch (e) {
        state.filterRegexInvalid = true
        state.filterRegex = ANY_RE
      }
    } else {
      // simple case-insensitve search
      state.filterRegexInvalid = false
      state.filterRegex = new RegExp(escapeStringForRegExp(filter), 'i')
    }
  },

  INSPECTED_MODULE(state, module) {
    state.inspectedModule = module
  },
}

export function reset(state) {
  state.history = []
  state.inspectedIndex = state.activeIndex = -1
  inspectedState.value = null
  SharedData.snapshotLoading = false
}

function escapeStringForRegExp(str) {
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

const getters = {
  filteredHistory({ history, filterRegex }) {
    return history.filter(entry => filterRegex.test(entry.mutation.type))
  },

  inspectedEntry({ inspectedIndex }, { filteredHistory }) {
    return filteredHistory[inspectedIndex]
  },

  inspectedState({ inspectedModule }, { inspectedEntry }) {
    const data = inspectedEntry ? inspectedState.value : base.value
    return processInspectedState({ entry: inspectedEntry, data, inspectedModule })
  },

  inspectedLastState({ inspectedModule }, { inspectedEntry }) {
    return processInspectedState({ entry: inspectedEntry, data: lastReceivedState.value, inspectedModule })
  },

  absoluteInspectedIndex({ history }, { inspectedEntry }) {
    return history?.indexOf(inspectedEntry) ?? -1
  },

  modules({}, { inspectedEntry }) {
    const data = inspectedEntry ? inspectedState.value : base.value
    if (data) {
      return data.modules
    }
    return []
  },
}

function processInspectedState({ entry, data, inspectedModule }) {
  const res = {}

  if (entry) {
    res.mutation = {
      type: entry.mutation.type,
      payload: entry.mutation.payload ? parse(entry.mutation.payload) : undefined,
    }
  }

  if (data) {
    res.state = data.state
    res.getters = data.getters

    if (inspectedModule) {
      res.state = get(res.state, inspectedModule.replace(/\//g, '.'))

      if (res.getters) {
        res.getters = Object.keys(res.getters)
          .filter(key => key.startsWith(inspectedModule))
          .reduce((obj, key) => {
            obj[key.substr(inspectedModule.length + 1)] = res.getters[key]
            return obj
          }, {})
      }
    }
  }

  if (SharedData.vuexGroupGettersByModule && res.getters) {
    const getterGroups = {}
    const keys = Object.keys(res.getters)
    keys.forEach(key => {
      const parts = key.split('/')
      let parent = getterGroups
      for (let p = 0; p < parts.length - 1; p++) {
        const part = `__vue__${parts[p]}`
        parent = parent[part] = parent[part] || {
          _custom: {
            value: {},
            abstract: true,
          },
        }
        parent = parent._custom.value
      }
      parent[parts.pop()] = res.getters[key]
    })
    res.getters = getterGroups
  }

  return res
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
}
