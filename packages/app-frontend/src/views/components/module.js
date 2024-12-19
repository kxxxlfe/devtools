import Vue, { ref, computed } from 'vue'

// 树形相关use
const scrollToExpanded = ref(null)
const expansionMap = ref({})
const instances = ref([])
const instancesMap = ref({})
const updateExpand = function ({ id, expanded, scrollTo = null } = {}) {
  Vue.set(expansionMap.value, id, expanded)
  scrollToExpanded.value = scrollTo
}
window.expansionMap = expansionMap

const totalCount = computed(() => {
  return Object.keys(instancesMap.value).length
})

export const useComponentTree = function () {
  // 展开到某个节点
  function toggleInstance({ instance, expanded, recursive, parent = false } = {}) {
    const id = instance.id

    updateExpand({
      id,
      expanded,
      scrollTo: parent ? id : null,
    })

    if (recursive) {
      instance.children.forEach(child => {
        toggleInstance({
          instance: child,
          expanded,
          recursive,
        })
      })
    }

    // Expand the parents
    if (parent) {
      let i = instance
      while (i.parent) {
        i = i.parent
        updateExpand({
          id: i.id,
          expanded: true,
          scrollTo: id,
        })
      }
    }
  }

  let inspectTime = null
  function flush(payload) {
    let start
    if (process.env.NODE_ENV !== 'production') {
      start = window.performance.now()
    }

    // Instance ID map
    // + add 'parent' properties
    const map = {}
    function walk(instance) {
      map[instance.id] = instance
      if (instance.children) {
        instance.children.forEach(child => {
          child.parent = instance
          walk(child)
        })
      }
    }
    payload.instances.forEach(walk)

    // Mutations
    instances.value = Object.freeze(payload.instances)
    instancesMap.value = Object.freeze(map)

    if (process.env.NODE_ENV !== 'production') {
      Vue.nextTick(() => {
        console.log(`devtools render took ${window.performance.now() - start}ms.`)
        if (inspectTime != null) {
          console.log(`inspect component took ${window.performance.now() - inspectTime}ms.`)
          inspectTime = null
        }
      })
    }
  }

  return { instances, instancesMap, expansionMap, scrollToExpanded, totalCount, toggleInstance, flush }
}
