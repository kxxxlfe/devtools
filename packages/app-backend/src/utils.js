export function findRelatedComponent(el) {
  while (!el.__vue__ && el.parentElement) {
    el = el.parentElement
  }
  return el.__vue__
}

export const debounce = function(func, timer) {
  let debounceTimer = null
  return function(...args) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => func(...args), timer)
  }
}
