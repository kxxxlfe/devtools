# app-backend 中 Vue2 专用 API / 内部用法汇总

用于抽象「Vue2 适配层」时，需要替换或封装的 Vue2 特有 API 与内部属性/方法。

---

## 1. DOM 上的 Vue2 属性

| 用法           | 文件:行号    | 说明                                                                     |
| -------------- | ------------ | ------------------------------------------------------------------------ |
| `node.__vue__` | index.js:192 | 从 DOM 节点取当前节点对应的 Vue 组件实例（Vue2 在 patch 时挂到根元素上） |

---

## 2. 全局 / target 上的 Vue2 Devtools Hook（注入由 Vue 或 devtools 提供）

| 用法                                           | 文件:行号                                          | 说明                                                       |
| ---------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `target.__VUE_DEVTOOLS_GLOBAL_HOOK__`          | index.js:35, 等; hook.js; highlighter.js:197       | 全局 hook 对象，上有 `Vue`、`store`、`on/once/off/emit` 等 |
| `target.__VUE_DEVTOOLS_INSTANCE_MAP__`         | index.js:48                                        | 实例 ID → 实例 的 Map                                      |
| `target.__VUE_DEVTOOLS_FUNCTIONAL_VNODE_MAP__` | index.js:50                                        | 函数式组件 vnode 的 Map                                    |
| `target.__VUE_DEVTOOLS_ROOT_UID__`             | index.js:173-174                                   | 根实例上的 devtools 根 UID                                 |
| `target.__VUE_DEVTOOLS_UID__`                  | 多处                                               | 组件实例上的 devtools 唯一 ID                              |
| `target.__VUE_DEVTOOLS_TOAST__`                | index.js:560; toast.js:12                          | 页面内 toaster 回调                                        |
| `target.__VUE_DEVTOOLS_INSPECT__`              | index.js:564; component-selector.js:86; hook.js:96 | 在页面中定位/审查实例的回调                                |
| `target.__VUE_DEVTOOLS_CONTEXT_MENU_TARGET__`  | contextmenu.js:16                                  | 右键菜单当前目标实例                                       |
| `target.__VUE_ROOT_INSTANCES__`                | index.js:197-198                                   | 非浏览器环境下的根实例数组（如 SSR）                       |

---

## 3. Vue 构造函数 / 类 API（Vue2）

| 用法                                           | 文件:行号             | 说明                                                       |
| ---------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| `import Vue from 'vue'`                        | index.js:3; vuex.js:1 | 使用 Vue2 构造函数                                         |
| `Vue.config.devtools`                          | index.js:32           | Vue2 全局 config                                           |
| `baseVue.config && baseVue.config.devtools`    | index.js:170          | 通过继承链上的构造函数取 devtools 配置                     |
| `baseVue.super`                                | index.js:167-168      | Vue2 通过 `Vue.extend` 形成的继承链（`.super` 指向父构造） |
| `new Vue({ ... })`                             | vuex.js:187           | 创建内部用的 Vue 实例（如 snapshotsVm）                    |
| `hook.Vue.set` / `hook.Vue.delete`             | index.js:624-625      | Vue2 的 `Vue.set` / `Vue.delete`（响应式增删）             |
| `target.__VUE_DEVTOOLS_GLOBAL_HOOK__.Vue.util` | highlighter.js:197    | Vue2 内部 util，如 `mapNodeRange`（Fragment 高亮）         |

---

## 4. 组件实例上的公开 API（Vue2 实例属性/方法）

| 用法                 | 文件:行号                                                                                                    | 说明                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `instance.$root`     | index.js:157-158, 537; process.js:74                                                                         | 根实例                                     |
| `instance.$parent`   | index.js:291; utils.js:11                                                                                    | 父实例                                     |
| `instance.$children` | index.js:291, 404-405                                                                                        | 子实例数组                                 |
| `instance.$el`       | highlighter.js:92                                                                                            | 根 DOM 元素                                |
| `instance.$refs`     | process.js:186-188, 206, 247                                                                                 | 模板 refs                                  |
| `instance.$options`  | process.js:72, 108, 167-168, 238, 283, 342; index.js:344, 483; vuex.js:191; perf.js:85-86, 102, 109, 120-126 | 组件选项对象                               |
| `instance.$vnode`    | index.js:401, 425-430, 498                                                                                   | 当前实例在父树中的 vnode                   |
| `instance.$route`    | index.js:428-429; process.js:307                                                                             | vue-router 的当前路由（Vue2 + vue-router） |
| `instance.$on(...)`  | index.js:447, 457                                                                                            | 事件总线：监听（如 `hook:beforeDestroy`）  |
| `this.$once(...)`    | perf.js:107                                                                                                  | 事件总线：一次性监听                       |

---

## 5. 组件实例上的内部属性（Vue2 未文档化，依赖实现细节）

| 用法                         | 文件:行号                                               | 说明                                     |
| ---------------------------- | ------------------------------------------------------- | ---------------------------------------- |
| `instance._uid`              | index.js:398, 538; events.js:23                         | 内部实例 UID                             |
| `instance._vnode`            | index.js:292, 294, 344-345, 410-411                     | 当前实例的渲染 vnode（根 vnode）         |
| `instance._data`             | process.js:169, 173; index.js:644                       | 组件 data 的响应式对象                   |
| `instance._props`            | process.js:90, 167; index.js:641-642                    | 组件 props 对象                          |
| `instance._setupState`       | process.js:201; index.js:632-633                        | 组合式 API setup() 返回的状态（Vue 2.7） |
| `instance._inactive`         | index.js:402, 415, 428                                  | keep-alive 非激活                        |
| `instance._isFragment`       | index.js:160, 403; highlighter.js:101                   | Fragment 根节点标记                      |
| `instance._isBeingDestroyed` | index.js:275, 326, 405                                  | 正在销毁标记                             |
| `instance._routerView`       | index.js:426, 430                                       | vue-router 的 router-view 内部标记       |
| `instance.fnContext`         | index.js:323, 349-350, 367, 454, 457; highlighter.js:49 | 函数式组件的上下文（即父实例）           |
| `instance.fnOptions`         | process.js:72; index.js:480-483                         | 函数式组件的选项                         |

---

## 6. Vnode 上的 Vue2 内部属性

| 用法                                                   | 文件:行号                               | 说明                                     |
| ------------------------------------------------------ | --------------------------------------- | ---------------------------------------- |
| `vnode.componentInstance`                              | index.js:294, 323-326, 344-345, 369-375 | 该 vnode 对应的组件实例                  |
| `vnode.fnContext`                                      | index.js:350, 454, 457                  | 函数式 vnode 的上下文实例                |
| `vnode.fnOptions`                                      | index.js:480-483                        | 函数式 vnode 的选项                      |
| `vnode.children`                                       | index.js:292, 364-375, 411              | 子 vnode 列表                            |
| `vnode.data.routerView` / `vnode.data.routerViewDepth` | index.js:425, 430                       | vue-router 在 vnode.data 上的标记        |
| `instance.$vnode.componentOptions.Ctor.options`        | index.js:498                            | 通过 vnode 取组件构造选项（如 `__file`） |
| `instance.$vnode['key']`                               | index.js:401                            | 渲染 key                                 |

---

## 7. Fragment 相关（Vue2 实现细节）

| 用法                                                | 文件:行号              | 说明                                                |
| --------------------------------------------------- | ---------------------- | --------------------------------------------------- |
| `currentFragment._fragmentEnd`                      | index.js:186           | 当前 Fragment 的结束节点（DOM walk 用）             |
| `getFragmentRect({ _fragmentStart, _fragmentEnd })` | highlighter.js:123-125 | 用 `Vue.util.mapNodeRange` 计算 Fragment 的矩形区域 |

---

## 8. Vuex 相关（Vue2 + Vuex 3）

| 用法                                                        | 文件:行号                  | 说明                                   |
| ----------------------------------------------------------- | -------------------------- | -------------------------------------- |
| `this.store._vm`                                            | vuex.js:191, 442, 444, 599 | Vuex 3 内部用于响应式的 Vue 实例       |
| `this.store._vm.$options.computed`                          | vuex.js:191                | 上述内部实例的 computed                |
| `instance.$options.vuex` / `instance.$options.vuex.getters` | process.js:168, 342        | 旧版 vuex 的 mapState 等注入的 getters |

---

## 9. 从 vue 包直接导入（Vue 2.7 组合式 API）

| 用法                                      | 文件:行号    | 说明                                     |
| ----------------------------------------- | ------------ | ---------------------------------------- |
| `import { isRef, isReadonly } from 'vue'` | process.js:2 | 判断 ref/readonly（Vue 2.7 从 vue 导出） |
| `import Vue, { watch } from 'vue'`        | vuex.js:1    | Vue 构造函数与 watch（Vue 2.7）          |

---

## 10. 按文件索引（便于改造成 Vue2 适配层）

- **index.js**  
  `__vue__`、`__VUE_*`、`Vue.config`、`baseVue.super`、`$root`/`$parent`/`$children`、`$options`、`$vnode`、`$route`、`$on`、`_uid`、`_vnode`、`_inactive`、`_isFragment`、`_isBeingDestroyed`、`_routerView`、`_setupState`、`_props`、`_data`、`_fragmentEnd`、`__VUE_ROOT_INSTANCES__`、`fnContext`/`fnOptions`/`componentInstance`、`hook.Vue.set/delete`。

- **utils.js**  
  `el.__vue__`、`instance.$parent`、`instance.__VUE_DEVTOOLS_UID__`。

- **process.js**  
  `instance.__VUE_DEVTOOLS_UID__`、`$options`、`$root`、`_props`、`_data`、`$refs`、`_setupState`、`$options.computed`/`vuex`/`inject`、`$route`、`isRef`/`isReadonly`（来自 vue）。

- **vuex.js**  
  `Vue`/`watch`、`new Vue(...)`、`store._vm`、`this.store._vm.$options.computed`。

- **highlighter.js**  
  `instance.$el`、`instance.elm`、`instance.fnContext`/`fnOptions`、`__VUE_DEVTOOLS_UID__`、`_isFragment`、`_fragmentStart`/`_fragmentEnd`、`Vue.util.mapNodeRange`。

- **events.js**  
  `vm._uid`。

- **perf.js**  
  `vm.$options`、`$once`。

- **hook.js / component-selector.js / contextmenu.js / toast.js**  
  仅使用 `__VUE_DEVTOOLS_*` 或 hook，不直接依赖实例/Vnode 结构。

抽象 Vue2 层时，可针对上表每一项在适配层提供「获取实例 / 取选项 / 取 vnode / 事件 / 响应式 set/delete / util」等统一接口，再在 app-backend 中只依赖这些接口，从而为将来支持 Vue3 或其它框架留出空间。
