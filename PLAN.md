# Opus 4.6 架构师 + Codex CLI 实现者 工作流计划

## 背景

**问题**: 建立两层 AI 协作工作流 —— Claude Code (Opus 4.6) 负责规划、定义边界、制定验收条件，Codex CLI 负责具体代码实现，最后 Opus 回来做验收和迭代修改。

**方案**: 通过 Codex CLI 的 `codex exec` 命令（以及 MCP server 集成）将 Codex 接入 Claude Code，形成 "规划→实现→验收→修复" 的闭环。用一个示例项目（Markdown 链接检查器 CLI 工具）来演示整个流程。

**当前状态**:
- Codex CLI v0.116.0 已安装 (`/opt/homebrew/bin/codex`)
- 已通过 ChatGPT OAuth 认证
- 模型配置为 `gpt-5.3-codex`
- MCP server 已配置在 `~/.claude/.mcp.json`（下次重启生效）
- 当前通过 `codex exec --full-auto` 作为 Bash 回退方案执行

---

## 第一步：配置 codex-mcp server ✅ 已完成

在 `~/.claude/.mcp.json` 中新增了 `codex-cli` 条目。

## 第二步：验证 Codex 连通性 ✅ 已完成

通过 `codex exec` 验证 Codex CLI 可正常工作。
注：Codex 沙箱限制网络访问（EPERM），`npm install` 需在 Opus 侧执行。

---

## 第三步：示例项目 — Markdown 链接检查器

### 项目规格

| 项 | 值 |
|---|---|
| 名称 | `mdlink-check` |
| 路径 | `/Users/licko/Documents/workspace/cc_test/mdlink-check/` |
| 语言 | Node.js + TypeScript |
| 用途 | 扫描 Markdown 文件中的链接，HTTP HEAD 检查是否可访问，报告结果 |

### 文件结构

```
mdlink-check/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        # CLI 入口 (commander)
│   ├── parser.ts       # 从 Markdown 提取链接
│   ├── checker.ts      # HTTP HEAD 验证 URL
│   └── reporter.ts     # 格式化输出结果
├── tests/
│   ├── parser.test.ts
│   ├── checker.test.ts
│   └── integration.test.ts
└── fixtures/
    └── sample.md       # 含好链接和坏链接的测试文件
```

### 验收条件

| ID | 条件 | 验证命令 |
|----|------|---------|
| AC-1 | TypeScript 编译零错误 | `npm run build` exit 0 |
| AC-2 | 有坏链接时 exit 1，无坏链接 exit 0 | `node dist/index.js fixtures/sample.md; echo $?` |
| AC-3 | 输出显示每个链接及状态 (OK/BROKEN/TIMEOUT) | 目视检查输出 |
| AC-4 | 全部测试通过，≥8 个测试用例 | `npm test` |
| AC-5 | 支持 glob 模式 | `node dist/index.js "fixtures/**/*.md"` |
| AC-6 | 支持 `--timeout` 和 `--verbose` 参数 | 带参数运行 |

---

## 第四步：架构师-实现者 迭代循环

每轮流程：**Opus 编写 Prompt → 调用 Codex → Codex 实现 → Opus 读取代码 + 运行测试 → 判断是否通过 → 不通过则构造修复 Prompt 再次调用 Codex**

### Round 1: 项目脚手架 ✅ 一次通过
- Codex 创建了 package.json, tsconfig.json, 所有 stub 文件, fixtures/sample.md
- npm install 因沙箱限制在 Opus 侧执行
- tsc 编译零错误

### Round 2: 实现 parser 模块 ✅ 一次通过
- 实现了完整的 extractLinks()：内联链接、引用链接、代码块跳过、HTTP 过滤
- 7 个 vitest 测试用例全部通过

### Round 3: 实现 checker 模块 ✅ 一次通过
- checkLink(): HEAD + GET fallback, AbortController timeout, 错误分类
- checkLinks(): 并发池控制，保序返回
- 5 个测试用例（含 mock fetch）全部通过

### Round 4: 实现 reporter + CLI 入口 + 集成测试 ✅ 一次通过
- reporter: chalk 颜色输出 + verbose 模式 + 汇总行
- CLI: commander 参数解析 + glob 展开 + URL 去重 + exit code
- 3 个集成测试全部通过
- 总计 15 tests, 3 test files

### Round 5: 修复轮 — 未需要
- 所有 4 轮均一次通过，无需修复

---

## 第五步：最终验收 ✅ 全部通过

| AC | 结果 | 详情 |
|----|------|------|
| AC-1 | ✅ | `npm run build` exit 0, TypeScript 编译零错误 |
| AC-2 | ✅ | 有坏链接时 exit 1（sample.md 含 2 broken → exit 1） |
| AC-3 | ✅ | 输出 `[OK] url` / `[BROKEN] url` 格式，带颜色 |
| AC-4 | ✅ | 15 tests 全通过（要求 ≥8）：7 parser + 5 checker + 3 integration |
| AC-5 | ✅ | `node dist/index.js "fixtures/**/*.md"` 正常工作 |
| AC-6 | ✅ | `--timeout 1000` 生效（3 个 TIMEOUT），`--verbose` 显示详细信息 |

---

## 回退方案

本次实际使用了 Bash 回退方案（`codex exec --full-auto`），因为 MCP server 需要重启 Claude Code 才生效。
功能等价，Opus 仍能构造 prompt → 执行 → 读取文件 → 验证 → 迭代。

---

## 经验总结

1. **Codex 沙箱限制**：Codex sandbox 会阻止 `npm install`（EPERM on proxy），需要在 Opus 侧执行网络操作
2. **一次通过率**：4 轮全部一次通过，精确的 prompt（含函数签名、类型、ESM 约束）是关键
3. **角色分工有效**：Opus 负责架构设计和验收，Codex 负责实现，分工清晰效率高
4. **Token 消耗**：4 轮 Codex 调用总计约 90K tokens

*最后更新：2026-03-22*
