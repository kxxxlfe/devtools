import { ref } from 'vue'
const headerMsg = ref('')
const view = ref('vertical')
export const useApp = function () {
  const updateHeaderMsg = function (msg) {
    headerMsg.value = msg
  }

  const updateView = function (view2) {
    view.value = view2
  }

  return { headerMsg, updateHeaderMsg, view, updateView }
}
