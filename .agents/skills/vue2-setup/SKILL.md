---
name: vue2-setup
description: 将 Vue 2 Class 组件迁移到 Vue 2.7 Setup 格式。当用户需要迁移 vue-class-component 代码到 Composition-API 时使用。
---

# Vue 2 Class → Vue 2.7 Setup 迁移

文件最开始使用vue@2格式的class方案书写，现在需要迁移为vue@2.7的setup格式，项目全部使用vue@2.7

## 使用时机

- 当用户提到"修改为 setup"、"迁移到 setup"
- 当用户提到"改为 setup"时

## 参考示例

代码setup格式参考如下示例文件格式
`animal-world/platforms/aweb-config/src/views/InLevelActivitySnake/InLevelActivityPreview/InLevelActivityPreview.vue`

## 迁移规则

### 1. 注释保留

**重要**：必须保留原始代码中的所有注释。

- 方法上方的注释应移至 setup 中对应函数定义的上方
- 行内注释应保留在相对位置

### 2. 使用 state && toRefs 管理状态

```typescript
import { reactive, toRefs } from 'vue'

const state = reactive({
  loading: false,
  data: [],
})

return {
  ...toRefs(state),
  // 其他方法
}
```

### 3. vue2中的组件变量：$route, $router, $message 访问

使用 @aweb/pkg-common 的 useContext 替代 this

```typescript
import { useContext } from '@aweb/pkg-common'

const { $route, $router, $message } = useContext()
```

### 4. setup的return语句清理

只返回模板中实际使用的值

- 移除模板中未使用的内部辅助函数
- 移除临时变量
- 只保留：模板绑定的数据、方法、计算属性

### 5. import顺序

按以下顺序组织 import：

- Node 模块（vue、lodash 等）
- @aweb/ 开头的包
- 项目相对导入（@/、./、../）

示例：

```typescript
import { reactive, computed, onMounted } from 'vue'
import { useContext } from '@aweb/pkg-common'
import { someUtil } from '@/utils/helper'
```

### 6. Props 类型定义

使用 Vue 提供的 `PropType` 为复杂类型的 props 添加 TypeScript 类型支持：

示例：

```typescript
import { PropType } from 'vue'

props: {
  // 数组类型
  items: {
    type: Array as PropType<number[]>, default: () => [],
  },
  // 对象类型
  config: {
    type: Object as PropType<{ name: string; value: number }>, default: () => ({}),
  },
}
```

### 7. tsx 支持

- 弹窗使用了`tsx`语法
  可以从`useContext`中获取`h`方法，参考示例：`animal-world/platforms/aweb-config/src/components/selector/platformV2/PlatformSelectorV2.vue`

**注意**：不要使用 `Array as () => number[]` 这种写法，应使用 `PropType<T>` 更加清晰规范。

## 验证清单

- [ ] 所有注释已保留
- [ ] 移除了 `vue-class-component` 和 `vue-property-decorator` 导入
- [ ] 使用 `useContext()` 替代 `this.$route/$router/$message`
- [ ] state 使用 `...toRefs(state)` 导出
- [ ] return 中只包含模板使用的属性
- [ ] 移除了未使用的 import
- [ ] import顺序正确
- [ ] 所有 `this.` 已移除
- [ ] 复杂类型 props 使用 `PropType<T>` 定义类型
- [ ] 组件功能保持一致
