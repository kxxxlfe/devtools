---
name: gh-release
description: 发布 vue-devtools GitHub Release。当用户说"发release"、"发布release"、"发版"、"发一个release"时触发。格式："发release {版本号}"，例如"发release 5.5.3"，"发布 5.5.3"。
---

# vue-devtools GitHub Release 发布

将构建产物打包并发布到 GitHub Release，同时创建 PR 合并到 base 分支。

## 触发条件

- 用户说"发 release {版本号}"，例如"发 release 5.5.3"
- 用户说"发布 release"、"发版"并带有版本号

## 参数提取

从用户消息中提取版本号，例如"发 release 5.5.3" → 版本号为 `5.5.3`。

如果用户没有提供版本号，从 `package.json` 的 `version` 字段读取当前版本号，并询问用户确认。

## 执行步骤

### Step 0: 验证 gh CLI 登录状态

1. 运行 `gh auth status` 检查登录状态
2. 如果已登录（退出码 0）→ 继续执行 Step 1
3. 如果未登录（退出码非 0）：
   - 运行 `gh auth login` 启动交互式登录流程
   - **等待用户在终端中完成登录操作**
   - 登录完成后再次运行 `gh auth status` 确认登录成功
   - 如果仍然未登录 → 停止，提示用户手动执行 `gh auth login` 后重试

### Step 1: 确认版本号与当前分支

1. 读取 `package.json` 中的 `version` 字段作为 `curVer`
2. 确认用户指定的版本号 `ver`（如果未指定则使用 `curVer`）
3. 获取当前 git 分支名 `currentBranch`（`git branch --show-current`）
4. 向用户确认：
   - 版本号: `ver`
   - 当前分支: `currentBranch`
   - 目标 base 分支: `base/5.3.4`（固定值）
   - release tag: `v{ver}`
   - zip 文件名: `vue-devtools@{ver}.zip`

**必须等用户确认后才继续。**

### Step 2: 构建

```bash
npm run build
```

### Step 3: 打包 zip

```bash
cd ./packages/shell-chrome && npm run zip
```

这会在 `packages/shell-chrome/` 下生成 `shell-chrome.zip`。

### Step 4: 重命名 zip

```bash
cp packages/shell-chrome/shell-chrome.zip dist/vue-devtools@{ver}.zip
```

确保 `dist/` 目录存在，如果不存在则创建。

### Step 5: 创建 GitHub PR

使用 `gh` CLI 创建 PR，从当前分支合并到 `base/5.3.4`：

```bash
gh pr create \
  --base base/5.3.4 \
  --head {currentBranch} \
  --title "Release v{ver}" \
  --body "Release v{ver}" \
  --repo kxxxlfe/devtools
```

> **注意**：必须加 `--repo kxxxlfe/devtools`，否则 `gh` 可能因 repo 解析失败而报误导性错误（如 "No commits between"）。

PR URL 示例格式参考：`https://github.com/kxxxlfe/devtools/compare/base/5.3.4...kxxxlfe:devtools:feature/5.5.4?expand=1`

### Step 6: 创建 GitHub Release

根据当前分支和分支 `origin/base/5.3.4` 的代码改动，总结一段 {note}

```bash
gh release create v{ver} \
  dist/vue-devtools@{ver}.zip \
  --title "v{ver}" \
  --notes "{note}" \
  --repo kxxxlfe/devtools
```

> **注意**：必须加 `--repo kxxxlfe/devtools`，否则 `gh` 可能因 repo 解析失败而报误导性错误（如 "workflow scope may be required"）。

- tag 为 `v{ver}`
- 上传 `dist/vue-devtools@{ver}.zip` 作为 release asset
- release notes 留空，用户之后到网页上自行编辑

### Step 7: 输出结果

完成后输出：

- PR URL
- Release URL
- 上传的 zip 文件名

## 前置条件

- `gh` CLI 已安装且已登录（`gh auth status` 验证）
- 当前在项目根目录
- git 工作区干净或有预期变更

## 错误处理

- `gh` 未安装 → 提示 `brew install gh && gh auth login`
- `gh` 未登录 → 提示 `gh auth login`
- 构建失败 → 停止，报告错误
- PR 创建失败 → 报告错误，询问是否继续创建 Release
- Release 创建失败 → 报告错误

## 注意事项

- **不要**自动 commit 或 push 代码变更
- **不要**修改 `package.json` 版本号（用户自行管理）
- **不要**自动编辑 release notes（用户到网页上改）
- base 分支固定为 `base/5.3.4`
- 仓库为 `kxxxlfe/devtools`
