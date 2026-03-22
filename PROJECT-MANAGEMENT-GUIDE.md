# 项目代码管理完整指南

> 以 `mdlink-check` 项目为实际案例，演示从零到持续维护的全流程。

---

## 目录

1. [Git 版本控制基础](#1-git-版本控制基础)
2. [Commit 规范](#2-commit-规范)
3. [远程仓库（GitHub）](#3-远程仓库github)
4. [分支策略](#4-分支策略)
5. [Pull Request 工作流](#5-pull-request-工作流)
6. [CI/CD 持续集成](#6-cicd-持续集成)
7. [项目可维护性清单](#7-项目可维护性清单)
8. [版本发布](#8-版本发布)
9. [完整操作速查表](#9-完整操作速查表)

---

## 1. Git 版本控制基础

### 1.1 三层保护模型

```
工作目录 ──git add──▶ 暂存区 ──git commit──▶ 本地仓库 ──git push──▶ 远程仓库
(你正在改)            (准备提交)              (本机历史)              (云端备份)
```

| 层级 | 防护范围 | 风险 |
|------|---------|------|
| 工作目录 | 无 | 改错了没法回退 |
| 本地仓库 | 防"改错" | 硬盘坏了就没了 |
| 远程仓库 | 防"丢失" + 协作 | 基本无风险 |

**核心原则：代码只存在本地等于不存在。**

### 1.2 实际操作：初始化项目

```bash
# mdlink-check 项目初始化过程
mkdir mdlink-check && cd mdlink-check
git init                    # 创建本地 git 仓库
git commit --allow-empty -m "Initial commit"  # 空的初始提交
```

### 1.3 .gitignore — 告诉 Git 忽略什么

mdlink-check 的 `.gitignore`：

```
node_modules/    # 依赖文件夹（太大，且可通过 npm install 重建）
dist/            # 编译产物（可通过 npm run build 重建）
```

**原则**：可重建的文件不入库，敏感信息（`.env`、密钥）绝不入库。

---

## 2. Commit 规范

### 2.1 Conventional Commits 格式

```
<type>: <简短描述>

可选的详细说明（解释为什么要做这个改动）
```

常用 type：

| Type | 含义 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: add --json output option` |
| `fix` | 修复 bug | `fix: handle timeout for slow DNS resolution` |
| `refactor` | 重构 | `refactor: extract URL validation to helper` |
| `test` | 测试 | `test: add edge case for empty markdown` |
| `docs` | 文档 | `docs: add README and CI workflow` |
| `chore` | 工具/配置 | `chore: update TypeScript to v5.5` |

### 2.2 mdlink-check 实际 commit 历史

```
97696cc feat: add --json output option (#1)          ← 通过 PR 合并
30d45cb docs: add README and GitHub Actions CI workflow
15962f7 feat: implement mdlink-check CLI tool via Opus+Codex workflow
73fa72f Initial commit
```

### 2.3 好 vs 坏的 commit

| 坏 | 好 | 为什么 |
|----|-----|--------|
| `update code` | `feat: add link timeout configuration` | 说清楚改了什么 |
| `fix bug` | `fix: exit code 0 when all links are broken` | 说清楚修了什么 bug |
| `wip` | 不 commit 半成品，用 `git stash` | 保持每个 commit 可运行 |
| 一个 commit 包含 10 个功能 | 一个功能一个 commit | 方便回退和 code review |

### 2.4 Commit 粒度原则

**一个逻辑单元 = 一个 commit**。判断标准：

- 这个 commit 能独立编译通过吗？→ 能，才提交
- 这个 commit 的改动能用一句话描述吗？→ 能，粒度合适
- 出问题需要回退，这个 commit 能安全 revert 吗？→ 能，粒度合适

---

## 3. 远程仓库（GitHub）

### 3.1 创建远程仓库

```bash
# 安装 GitHub CLI（macOS）
brew install gh

# 登录
gh auth login --hostname github.com --git-protocol https --web

# 创建仓库并推送（一条命令搞定）
gh repo create mdlink-check --public --source=. --push --description "CLI tool to check HTTP links in Markdown files"
```

这条命令做了 3 件事：
1. 在 GitHub 上创建 `mdlink-check` 仓库
2. 自动设置 `origin` 远程地址
3. 推送本地 main 分支到远程

### 3.2 日常推送

```bash
git push            # 推送到远程（已设置 upstream 后）
git push -u origin main  # 首次推送需要设置 upstream
```

### 3.3 公开 vs 私有仓库

| | Public | Private |
|---|---|---|
| 适合 | 开源项目、作品展示、社区工具 | 公司代码、练习项目、未完成作品 |
| 可见性 | 任何人可见 | 仅你和协作者 |
| CI | 免费 | 免费（有月度限额） |
| mdlink-check | ✅ 选择了 Public | |

---

## 4. 分支策略

### 4.1 主干开发模型（适合个人/小团队）

```
main ─────●─────●──────────●─────●──── (始终可部署)
           \              /       \
     feat/parser ──●──●──●     fix/timeout ──●
```

**规则**：
- `main` 分支始终保持可运行、可部署状态
- 每个新功能/修复在独立分支开发
- 通过 Pull Request 审查后合并回 main
- 合并后删除 feature 分支

### 4.2 mdlink-check 实际演示

添加 `--json` 输出功能的完整流程：

```bash
# 1. 从 main 创建 feature 分支
git checkout -b feat/json-output

# 2. 开发：修改 reporter.ts 和 index.ts
#    - 添加 formatResultsJson() 函数
#    - 添加 --json CLI 选项

# 3. 验证
npm run build   # 编译通过
npm test        # 15 tests 全通过

# 4. 提交
git add src/reporter.ts src/index.ts
git commit -m "feat: add --json output option"

# 5. 推送 feature 分支到远程
git push -u origin feat/json-output

# 6. 创建 Pull Request（见下一节）

# 7. CI 通过 + 审查通过后，合并并删除分支
gh pr merge 1 --squash --delete-branch
```

### 4.3 为什么不直接在 main 上改？

| 场景 | 直接改 main | 用分支 |
|------|------------|--------|
| 改到一半发现思路错了 | 回退很痛苦，可能丢失其他改动 | `git checkout main` 随时回到稳定版 |
| 紧急 bug 来了 | 得先处理半成品代码 | main 干净，随时 `git checkout -b hotfix/xxx` |
| 多人协作 | 互相踩脚 | 各自分支互不影响 |
| Code Review | 没法 review | PR 上清晰看到所有改动 |

### 4.4 分支命名规范

```
feat/xxx     — 新功能
fix/xxx      — Bug 修复
refactor/xxx — 重构
docs/xxx     — 文档更新
chore/xxx    — 工具/配置
```

---

## 5. Pull Request 工作流

### 5.1 创建 PR

```bash
gh pr create \
  --title "feat: add --json output option" \
  --body "## Summary
- Add --json flag for structured output
- Useful for CI pipelines and scripting

## Test plan
- [x] npm run build passes
- [x] All 15 tests pass
- [x] Manual test: node dist/index.js fixtures/sample.md --json"
```

### 5.2 PR 的价值

| 作用 | 说明 |
|------|------|
| Code Review | 即使是个人项目，PR 也帮你"第二次审视"代码 |
| CI 门禁 | PR 触发 CI，确保不会合入有 bug 的代码 |
| 变更记录 | 每个 PR 清晰记录"为什么做"和"改了什么" |
| 可回退 | 每个 PR 是一个逻辑单元，可整体 revert |

### 5.3 合并策略

| 策略 | 命令 | 适用场景 |
|------|------|---------|
| **Squash merge** | `gh pr merge --squash` | 推荐！feature 分支多个 commit 压成一个 |
| Merge commit | `gh pr merge --merge` | 保留完整 commit 历史 |
| Rebase | `gh pr merge --rebase` | 线性历史，但可能有冲突 |

mdlink-check 使用 **squash merge**：`feat/json-output` 分支的 commit 压成了一条 `97696cc feat: add --json output option (#1)`。

---

## 6. CI/CD 持续集成

### 6.1 什么是 CI？

```
开发者 push 代码 → GitHub Actions 自动运行 → build + test → ✅ 或 ❌
```

**作用**：自动守门员，确保每次代码变更都不会破坏项目。

### 6.2 mdlink-check 的 CI 配置

文件位置：`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]        # main 分支 push 时触发
  pull_request:
    branches: [main]        # PR 到 main 时触发

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20, 22]   # 三个 Node 版本并行测试

    steps:
      - uses: actions/checkout@v4          # 拉取代码
      - uses: actions/setup-node@v4        # 安装 Node.js
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm                       # 缓存 node_modules
      - run: npm ci                        # 安装依赖（用 lockfile）
      - run: npm run build                 # TypeScript 编译
      - run: npm test                      # 运行测试
```

### 6.3 配置解读

| 配置 | 说明 |
|------|------|
| `on.push.branches: [main]` | 只在 main 分支 push 时触发（不是每个分支都跑） |
| `on.pull_request` | PR 到 main 时触发，作为合并门禁 |
| `matrix.node-version` | 在多个 Node 版本上并行测试，确保兼容性 |
| `npm ci` | 比 `npm install` 更严格，完全按 lockfile 安装 |

### 6.4 实际运行结果

```
PR #1 CI 运行结果：
✓ build-and-test (Node 18) — 13s
✓ build-and-test (Node 20) — 13s
✓ build-and-test (Node 22) — 15s

3 个 job 全部通过，PR 才允许合并。
```

---

## 7. 项目可维护性清单

### 7.1 文件清单

| 文件 | 必要性 | 作用 | mdlink-check |
|------|--------|------|-------------|
| `.gitignore` | 必须 | 排除不需要追踪的文件 | ✅ |
| `package.json` | 必须 | 依赖和脚本定义 | ✅ |
| `package-lock.json` | 必须 | 锁定依赖版本，确保可复现 | ✅ |
| `tsconfig.json` | 必须(TS) | TypeScript 编译配置 | ✅ |
| `README.md` | 强烈推荐 | 项目说明、使用方法 | ✅ |
| `.github/workflows/ci.yml` | 强烈推荐 | CI 自动化 | ✅ |
| `tests/` | 强烈推荐 | 自动化测试 | ✅ 15 cases |
| `LICENSE` | 开源需要 | 许可证 | 可选 |
| `CHANGELOG.md` | 可选 | 版本变更记录 | 可选 |

### 7.2 README 的四要素

一个好的 README 回答 4 个问题：

```markdown
# 项目名称
（1）这是什么？ → 一句话描述
（2）怎么安装？ → 安装步骤
（3）怎么用？   → 使用示例和选项说明
（4）怎么开发？ → 开发环境搭建、测试命令
```

mdlink-check 的 README 结构：

```
README.md
├── Features          — 功能列表
├── Installation      — 安装步骤
├── Usage             — 使用方法 + 选项表 + Exit codes
├── Development       — npm install / build / test
├── Project Structure — 目录说明
└── Tech Stack        — 技术栈
```

### 7.3 测试是最好的文档

mdlink-check 的测试就是活文档：

| 测试文件 | 告诉你… |
|---------|---------|
| `parser.test.ts` | parser 支持哪些链接格式、跳过什么 |
| `checker.test.ts` | 各种 HTTP 状态码如何映射到 OK/BROKEN/TIMEOUT |
| `integration.test.ts` | 端到端流程如何工作 |

---

## 8. 版本发布

### 8.1 语义化版本（SemVer）

```
v1.0.0
│ │ │
│ │ └── patch: 修 bug（不改接口）     → 1.0.0 → 1.0.1
│ └──── minor: 加新功能（向后兼容）    → 1.0.0 → 1.1.0
└────── major: 破坏性变更（不兼容旧版） → 1.0.0 → 2.0.0
```

### 8.2 实际示例

| 变更 | 版本 |
|------|------|
| 初始发布 | `1.0.0` |
| 加了 `--json` 选项 | `1.1.0`（新功能，向后兼容） |
| 修了 timeout 处理的 bug | `1.1.1`（bug fix） |
| 把 `--verbose` 改成 `-v` 且删掉了旧格式 | `2.0.0`（破坏性变更） |

### 8.3 发布命令

```bash
# 更新版本号（自动修改 package.json + 创建 git tag）
npm version minor      # 1.0.0 → 1.1.0

# 推送代码和 tag
git push && git push --tags

# 可选：创建 GitHub Release
gh release create v1.1.0 --generate-notes
```

---

## 9. 完整操作速查表

### 日常开发流程

```bash
# 1. 开始新功能
git checkout main
git pull
git checkout -b feat/my-feature

# 2. 开发 + 测试
# ... 编写代码 ...
npm run build && npm test

# 3. 提交（可以多次小提交）
git add src/changed-file.ts
git commit -m "feat: add xxx"

# 4. 推送并创建 PR
git push -u origin feat/my-feature
gh pr create --title "feat: add xxx" --body "description"

# 5. CI 通过后合并
gh pr merge --squash --delete-branch

# 6. 回到 main
git checkout main
git pull
```

### 紧急修复流程

```bash
git checkout main
git pull
git checkout -b fix/urgent-bug
# ... 修复 ...
git add . && git commit -m "fix: xxx"
git push -u origin fix/urgent-bug
gh pr create --title "fix: xxx"
gh pr merge --squash --delete-branch
```

### 常用 Git 命令

| 命令 | 作用 |
|------|------|
| `git status` | 查看当前状态 |
| `git diff` | 查看未暂存的改动 |
| `git log --oneline -10` | 查看最近 10 条 commit |
| `git stash` / `git stash pop` | 临时保存/恢复工作进度 |
| `git checkout main` | 切回 main 分支 |
| `git branch -d xxx` | 删除已合并的分支 |

### 常用 GitHub CLI 命令

| 命令 | 作用 |
|------|------|
| `gh repo create` | 创建远程仓库 |
| `gh pr create` | 创建 Pull Request |
| `gh pr merge --squash` | Squash 合并 PR |
| `gh run list` | 查看 CI 运行状态 |
| `gh run watch` | 实时看 CI 运行 |
| `gh release create` | 创建 Release |

---

## 附录：mdlink-check 项目时间线

| 时间 | 操作 | 对应 Commit |
|------|------|------------|
| 开始 | git init + 空 commit | `73fa72f Initial commit` |
| Round 1-4 | Opus+Codex 协作实现全部代码 | `15962f7 feat: implement mdlink-check CLI tool` |
| 完善 | 添加 README + GitHub Actions CI | `30d45cb docs: add README and CI workflow` |
| 推送 | 创建 GitHub 仓库并推送 | — |
| 分支演示 | feat/json-output 分支 → PR #1 → CI 通过 → squash merge | `97696cc feat: add --json output option (#1)` |

仓库地址：https://github.com/licko96qq/mdlink-check

---

## 完成总结

整个流程已走完，以下是实际演示过的每一步：

| 步骤 | 做了什么 | 结果 |
|------|---------|------|
| 安装 gh CLI | `brew install gh` | v2.88.1 |
| GitHub 登录 | `gh auth login --web` | 已认证 licko96qq |
| 添加 README | 项目说明 + 使用方法 + 开发指南 | `README.md` |
| 添加 CI | GitHub Actions 在 Node 18/20/22 上跑 build+test | `.github/workflows/ci.yml` |
| 创建远程仓库 | `gh repo create --public` | https://github.com/licko96qq/mdlink-check |
| 推送代码 | `git push -u origin main` | main 分支 CI 通过 |
| 分支开发演示 | `feat/json-output` 分支添加 `--json` 功能 | 代码 + 测试通过 |
| PR 工作流 | 创建 PR → CI 三版本全绿 → squash merge | PR #1 已合并 |
| 教学文档 | 9 章完整指南写入 `PROJECT-MANAGEMENT-GUIDE.md` | 500+ 行 |

教学文档涵盖：Git 基础、Commit 规范、远程仓库、分支策略、PR 工作流、CI/CD、可维护性清单、版本发布、操作速查表 — 全部以 `mdlink-check` 真实操作为例。

### 关键收获

1. **代码只存在本地等于不存在** — 推送到 GitHub 才有真正的备份
2. **CI 是自动守门员** — 每次 push/PR 自动跑 build + test，防止引入 bug
3. **分支 + PR 是安全网** — 在 feature 分支开发，通过 PR 审查后合并，main 始终稳定
4. **小粒度 commit + 规范命名** — 出问题时能精准回退，`git log` 就是最好的变更历史
5. **README + 测试 = 活文档** — 告诉未来的自己（和别人）这个项目是什么、怎么用

---

*最后更新：2026-03-22*
