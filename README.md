<p align="center"><img width="720px" src="https://raw.githubusercontent.com/kxxxlfe/devtools/refs/heads/feature/5.5.1/media/screenshot2.png" alt="screenshot"></p>

# 特性
- 支持`vue@3`, `vue@2.7`的`setup`
- 支持`pinia`

# 基于`5.3.4`性能优化

[详细说明](https://segmentfault.com/a/1190000045204638)

- flush 截流：页面组件太多，频繁改动时 component 卡顿
- vuex:mutation 截流: 页面 store 太多，数千个 store 中间状态导致页面崩溃
- router:changed 开关不生效 fix，页面数据太多时会导致卡顿
- 解决 `@Ref` 语法计算属性导致的性能问题
- 解决 `VNode2` 识别有误，导致无效的序列化性能问题

# 使用步骤

1. `release` 下载 `zip` 文件
2. 解压缩为文件夹（直接使用`zip`被认定为临时文件，会导致一段时间后失效） 
3. 文件夹 添加至 chrome://extensions

# 环境
- `vite@5`
- `manifest v3`
- 支持`Promise`的通信 [https://github.com/defghy/web-toolkits/tree/main/packages/wtool-chrome-bridge]

# 开发步骤

```
pnpm install
npm run dev:chrome
npm run build
```

- icon 来源：https://fonts.google.com/icons?hl=zh-cn&icon.query=lens&icon.set=Material+Icons&icon.size=24&icon.color=%235f6368
- [数据](https://api.github.com/repos/kxxxlfe/devtools/releases)


### License

[MIT](http://opensource.org/licenses/MIT)
