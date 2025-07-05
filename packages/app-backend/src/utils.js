export function findRelatedComponent(el) {
  while (!el.__vue__ && el.parentElement) {
    el = el.parentElement
  }
  return el?.__vue__
}

// 找到带id的instance
export function findRelatedInstance(instance) {
  while (instance && !instance.__VUE_DEVTOOLS_UID__) {
    instance = instance.$parent
  }
  return instance
}

export function findRelatedInstanceId(instance) {
  return findRelatedInstance(instance)?.__VUE_DEVTOOLS_UID__
}

export const debounce = function (func, timer) {
  let debounceTimer = null
  return function (...args) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => func(...args), timer)
  }
}
