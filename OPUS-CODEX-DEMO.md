# Opus 4.6 + Codex CLI 协作工作流 — 完整演示记录

> 本文档记录了使用 Claude Code (Opus 4.6) 作为架构师 + Codex CLI 作为实现者，
> 从零构建 `mdlink-check` 项目并完成项目管理全流程的完整过程。

---

## 目录

1. [工作流概述](#1-工作流概述)
2. [环境准备](#2-环境准备)
3. [Round 1：项目脚手架](#3-round-1项目脚手架)
4. [Round 2：实现 Parser 模块](#4-round-2实现-parser-模块)
5. [Round 3：实现 Checker 模块](#5-round-3实现-checker-模块)
6. [Round 4：实现 Reporter + CLI + 集成测试](#6-round-4实现-reporter--cli--集成测试)
7. [最终验收（AC-1 到 AC-6）](#7-最终验收ac-1-到-ac-6)
8. [项目管理全流程演示](#8-项目管理全流程演示)
9. [完成总结](#9-完成总结)
10. [经验与收获](#10-经验与收获)

---

## 1. 工作流概述

### 1.1 两层 AI 协作模型

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code (Opus 4.6)                │
│                       角色：架构师                        │
│                                                          │
│  ● 规划项目结构和模块边界                                  │
│  ● 定义函数签名、类型、验收条件                            │
│  ● 编写精确的实现 Prompt                                  │
│  ● 验收代码（读取 + 编译 + 测试）                         │
│  ● 构造修复 Prompt（如有问题）                            │
└──────────────┬──────────────────────────┬────────────────┘
               │ 发送 Prompt              │ 读取结果
               ▼                          │
┌──────────────────────────────┐          │
│       Codex CLI (gpt-5.3)    │          │
│         角色：实现者           │          │
│                               │          │
│  ● 接收精确的实现指令          │──────────┘
│  ● 编写代码和测试              │
│  ● 在沙箱中执行验证            │
└──────────────────────────────┘
```

### 1.2 每轮迭代流程

```
Opus 编写 Prompt
       │
       ▼
调用 codex exec --full-auto
       │
       ▼
Codex 实现代码 + 测试
       │
       ▼
Opus 读取生成的文件
       │
       ▼
Opus 运行 tsc + vitest 验证
       │
       ├── 通过 → 进入下一轮
       │
       └── 未通过 → 构造修复 Prompt → 重新调用 Codex（最多 3 次）
```

### 1.3 连接方式

| 方式 | 配置 | 状态 |
|------|------|------|
| **MCP Server** | `~/.claude/.mcp.json` 中 `codex mcp-server` | 已配置，需重启 Claude Code 生效 |
| **Bash 回退** | `codex exec --full-auto "prompt"` | 本次实际使用 |

两种方式功能等价，Opus 均可：构造 Prompt → 执行 → 读取文件 → 验证 → 迭代。

---

## 2. 环境准备

### 2.1 环境状态

| 组件 | 版本/路径 | 说明 |
|------|----------|------|
| Claude Code | Opus 4.6 | 架构师 |
| Codex CLI | v0.116.0 (`/opt/homebrew/bin/codex`) | 实现者 |
| Codex 模型 | gpt-5.3-codex | OpenAI 模型 |
| 认证 | ChatGPT OAuth (`~/.codex/auth.json`) | 无需 OPENAI_API_KEY |
| 工作目录 | `/Users/licko/Documents/workspace/cc_test/mdlink-check/` | 已被 Codex 信任 |

### 2.2 MCP 配置

在 `~/.claude/.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "codex-cli": {
      "command": "codex",
      "args": ["mcp-server"]
    }
  }
}
```

### 2.3 连通性验证

```bash
$ codex exec --full-auto "Say hello"
Hello from Codex!
```

### 2.4 发现的限制

**Codex 沙箱限制网络访问**：`npm install` 在 Codex 内会报 `EPERM`（代理端口 10808 被阻止）。解决方案：网络操作（安装依赖、HTTP 请求）在 Opus 侧执行。

---

## 3. Round 1：项目脚手架

### 3.1 Opus 发送给 Codex 的 Prompt 要点

- 创建 `package.json`（name, type: module, scripts, dependencies, devDependencies）
- 创建 `tsconfig.json`（ES2022, Node16, strict）
- 创建 4 个 stub 文件（index.ts, parser.ts, checker.ts, reporter.ts）
- 创建 `fixtures/sample.md`（含好链接、坏链接、代码块内链接）
- 创建 `tests/` 和 `fixtures/` 目录

### 3.2 Codex 执行结果

Codex 成功创建了所有文件，但 `npm install` 因沙箱网络限制失败。

### 3.3 Opus 验收

```bash
# Opus 侧执行 npm install
$ npm install
added 62 packages, and audited 63 packages in 27s

# 验证 TypeScript 编译
$ npx tsc
# exit 0，零错误
```

**结果：✅ 一次通过**

---

## 4. Round 2：实现 Parser 模块

### 4.1 Opus Prompt 关键约束

- 函数签名：`extractLinks(markdown: string): LinkInfo[]`
- 必须处理：内联链接、引用式链接、跳过代码块
- 只提取 HTTP/HTTPS URL
- 使用 regex 解析，不用外部 AST 库
- ESM import（`.js` 扩展名）
- 7 个测试用例

### 4.2 Codex 产出

**`src/parser.ts`** — 154 行：
- 两遍扫描：第一遍收集引用定义，第二遍提取链接
- 嵌套括号匹配（`findMatchingBracket` / `findMatchingParen`）
- 代码围栏检测（`/^\s*```/`）

**`tests/parser.test.ts`** — 88 行，7 个测试：
1. 简单内联链接
2. 多行多链接（验证行号）
3. 跳过代码块
4. 引用式链接
5. 忽略相对链接和锚点
6. URL 中的特殊字符
7. 无链接返回空数组

### 4.3 Opus 验收

```bash
$ npx tsc          # exit 0
$ npx vitest run tests/parser.test.ts
# ✓ 7 tests passed
```

**结果：✅ 一次通过**

---

## 5. Round 3：实现 Checker 模块

### 5.1 Opus Prompt 关键约束

- `checkLink(url, timeout?)`：HEAD 优先，4xx/5xx 降级 GET
- `AbortController` 超时控制，默认 5000ms
- 返回值分类：OK (2xx/3xx) / BROKEN (4xx/5xx/网络错误) / TIMEOUT
- `checkLinks(urls, options?)`：并发池控制，保序返回
- 不使用任何外部库（无 p-limit），自实现 worker pool
- 使用 `vi.fn()` mock 全局 fetch

### 5.2 Codex 产出

**`src/checker.ts`** — 约 100 行：
- `fetchWithTimeout()`：封装 AbortController + clearTimeout
- `checkLink()`：HEAD → 失败时 GET fallback → 错误分类
- `checkLinks()`：worker pool 实现并发控制

**`tests/checker.test.ts`** — 5 个测试：
1. 200 → OK
2. 404 → BROKEN（验证 HEAD+GET 两次调用）
3. AbortError → TIMEOUT
4. 网络错误（DNS failure）→ BROKEN
5. checkLinks 并发 + 顺序保持

### 5.3 Opus 验收

```bash
$ npx tsc          # exit 0
$ npx vitest run
# ✓ 12 tests passed (7 parser + 5 checker)
```

**结果：✅ 一次通过**

---

## 6. Round 4：实现 Reporter + CLI + 集成测试

### 6.1 Opus Prompt 关键约束

- reporter：chalk 颜色（绿/红/黄），verbose 模式，汇总行
- CLI：commander，`<patterns...>` 参数，`--timeout`/`--verbose`/`--concurrency`
- glob 展开，URL 去重，exit code 1（有失败）/ 0（全通过）
- 集成测试：端到端 pipeline（parse → check → format），mock fetch
- **不修改** parser.ts 和 checker.ts

### 6.2 Codex 产出

**`src/reporter.ts`** — `formatResults(results, verbose)` + `formatResultsJson(results)`

**`src/index.ts`** — 完整 CLI：
- commander 参数解析
- glob 展开文件
- 读取 → 提取链接 → 去重 → 批量检查 → 格式化输出
- exit code 逻辑

**`tests/integration.test.ts`** — 3 个测试：
1. 完整 pipeline（解析 → 检查 → 格式化）
2. 失败检测（broken links → hasFailures = true）
3. 无链接场景

### 6.3 Opus 验收

```bash
$ npx tsc          # exit 0
$ npx vitest run
# ✓ 15 tests passed (7 + 5 + 3)
```

**结果：✅ 一次通过**

---

## 7. 最终验收（AC-1 到 AC-6）

| AC | 条件 | 验证命令 | 结果 |
|----|------|---------|------|
| AC-1 | TypeScript 编译零错误 | `npm run build` → exit 0 | ✅ |
| AC-2 | 有坏链接时 exit 1 | `node dist/index.js fixtures/sample.md; echo $?` → `1` | ✅ |
| AC-3 | 输出每个链接及状态 | 输出 `[OK]`/`[BROKEN]` 格式，带颜色 | ✅ |
| AC-4 | 全部测试通过，≥8 个 | `npm test` → 15 tests passed | ✅ |
| AC-5 | 支持 glob 模式 | `node dist/index.js "fixtures/**/*.md"` → 正常输出 | ✅ |
| AC-6 | `--timeout` 和 `--verbose` | `--timeout 1000` 生效（3 个 TIMEOUT），`--verbose` 显示详情 | ✅ |

### 实际输出样例

**普通模式**：
```
  [OK] https://example.com
  [OK] https://httpbin.org/status/200
  [BROKEN] https://httpbin.org/status/404
  [BROKEN] https://thisdomaindoesnotexist12345.com
4 links checked: 2 ok, 2 broken, 0 timeout
```

**`--timeout 1000 --verbose`**：
```
  [TIMEOUT] https://example.com (error=Request timed out)
  [TIMEOUT] https://httpbin.org/status/200 (error=Request timed out)
  [TIMEOUT] https://httpbin.org/status/404 (error=Request timed out)
  [BROKEN] https://thisdomaindoesnotexist12345.com (error=fetch failed)
4 links checked: 0 ok, 1 broken, 3 timeout
```

---

## 8. 项目管理全流程演示

在代码实现完成后，我们演示了完整的项目管理流程：

### 8.1 安装 GitHub CLI

```bash
$ brew install gh
# gh v2.88.1 installed (依赖 go 1.26.1)
```

### 8.2 GitHub 认证

```bash
$ gh auth login --hostname github.com --git-protocol https --web
# 浏览器 OAuth 认证完成
# ✓ Logged in as licko96qq
```

> 注意：初始的 GITHUB_TOKEN 环境变量缺少 `workflow` scope，无法推送 CI 配置。
> 通过 `unset GITHUB_TOKEN` + `gh auth login --web` 解决。

### 8.3 添加 README + CI

- **README.md**：功能、安装、使用、选项、项目结构、技术栈
- **.github/workflows/ci.yml**：Node 18/20/22 三版本并行 build + test

### 8.4 创建远程仓库并推送

```bash
$ gh repo create mdlink-check --public --source=. --push \
    --description "CLI tool to check HTTP links in Markdown files"
# https://github.com/licko96qq/mdlink-check
# main 分支 CI 运行：✅ success
```

### 8.5 分支开发演示

添加 `--json` 输出功能：

```bash
# 创建 feature 分支
$ git checkout -b feat/json-output

# 修改代码（reporter.ts + index.ts）
# 添加 formatResultsJson() 和 --json CLI 选项

# 验证
$ npm run build   # ✅
$ npm test        # ✅ 15 tests

# 提交并推送
$ git commit -m "feat: add --json output option"
$ git push -u origin feat/json-output
```

### 8.6 Pull Request 工作流

```bash
# 创建 PR
$ gh pr create --title "feat: add --json output option"
# https://github.com/licko96qq/mdlink-check/pull/1

# CI 运行结果：
# ✓ build-and-test (Node 18) — 13s
# ✓ build-and-test (Node 20) — 13s
# ✓ build-and-test (Node 22) — 15s

# Squash merge 并删除分支
$ gh pr merge 1 --squash --delete-branch
```

### 8.7 最终 Commit 历史

```
4b27d7a docs: add project management guide (Chinese)
97696cc feat: add --json output option (#1)
30d45cb docs: add README and GitHub Actions CI workflow
15962f7 feat: implement mdlink-check CLI tool via Opus+Codex workflow
73fa72f Initial commit
```

---

## 9. 完成总结

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

---

## 10. 经验与收获

### 10.1 Opus + Codex 协作效率

| 指标 | 数据 |
|------|------|
| 总轮次 | 4 轮 |
| 修复轮次 | 0（全部一次通过） |
| Codex Token 消耗 | ~90K tokens |
| 最终代码 | 4 个源文件 + 3 个测试文件 + 1 个 fixture |
| 测试覆盖 | 15 个测试用例 |

### 10.2 关键成功因素

1. **精确的 Prompt 是一切的基础**
   - 提供完整的函数签名和类型定义
   - 明确 ESM / strict mode / Node16 等约束
   - 指定 import 路径（`.js` 扩展名）
   - 给出测试用例的预期行为

2. **角色分离效果显著**
   - Opus 专注架构决策和质量把控
   - Codex 专注代码实现
   - 避免了单个 AI 同时思考"做什么"和"怎么做"

3. **沙箱限制需要预案**
   - Codex sandbox 阻止网络访问 → `npm install` 在 Opus 侧执行
   - 提前识别哪些操作需要网络，规划在 Opus 侧处理

4. **验收驱动开发**
   - 先定义 AC-1 到 AC-6 验收条件
   - 每轮结束 Opus 自动验证
   - 全部通过才进入下一轮

5. **项目管理不是事后补课**
   - 从第一个 commit 就规范
   - README、CI、分支策略一步到位
   - 后续维护成本极低

### 10.3 适用场景

这套工作流适用于：
- **明确需求的实现任务**（有清晰的接口定义和验收标准）
- **模块化的项目**（可以分轮次实现）
- **需要质量保证的项目**（架构师审查 + 自动化测试）

不太适合：
- 探索性研究（需求不明确，需要大量试错）
- 需要深度上下文理解的重构（Codex 每次调用无状态）

---

## 附录：项目文件清单

```
mdlink-check/
├── .git/
├── .github/workflows/ci.yml        # GitHub Actions CI
├── .gitignore                       # 排除 node_modules/ 和 dist/
├── README.md                        # 英文项目说明
├── README-中文.md                   # 中文项目说明
├── PLAN.md                          # 架构决策和实施记录
├── PROJECT-MANAGEMENT-GUIDE.md      # 项目管理教学指南
├── OPUS-CODEX-DEMO.md              # 本文档：完整演示记录
├── RESEARCH-PAPER-GIT-GUIDE.md     # 论文项目 Git 管理方案
├── package.json                     # 依赖和脚本
├── package-lock.json                # 依赖锁定
├── tsconfig.json                    # TypeScript 配置
├── src/
│   ├── index.ts                     # CLI 入口
│   ├── parser.ts                    # Markdown 链接提取
│   ├── checker.ts                   # HTTP 链接检查
│   └── reporter.ts                  # 结果格式化输出
├── tests/
│   ├── parser.test.ts               # 7 tests
│   ├── checker.test.ts              # 5 tests
│   └── integration.test.ts          # 3 tests
└── fixtures/
    └── sample.md                    # 测试用 Markdown 文件
```

仓库地址：https://github.com/licko96qq/mdlink-check

---

*最后更新：2026-03-22*
