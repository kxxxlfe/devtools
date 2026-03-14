import Vue from 'vue'
import v from './vue2'
import { getInstanceOrVnodeRect } from './rect'

Vue.config.devtools = false // 否则会干扰到vue2页面中的Vue

export default {
  ...v,
  getInstanceOrVnodeRect,
}
