# mdlink-check

> 本文件是 [README.md](./README.md) 的中文参考版本，Claude Code 以英文版为准。

一个 CLI 工具，用于扫描 Markdown 文件中的 HTTP 链接并检查其是否可访问。

## 功能特性

- 提取内联链接 `[文本](url)` 和引用式链接 `[文本][ref]`
- 自动跳过代码块内的链接
- HTTP HEAD 检查，失败时自动降级为 GET 请求
- 可配置超时时间和并发数
- 支持 glob 模式批量检查
- 彩色终端输出（OK / BROKEN / TIMEOUT）
- JSON 格式输出（`--json`），方便脚本和 CI 集成

## 安装

```bash
git clone https://github.com/licko96qq/mdlink-check.git
cd mdlink-check
npm install
npm run build
```

## 使用方法

```bash
# 检查单个文件
node dist/index.js README.md

# 使用 glob 模式检查多个文件
node dist/index.js "docs/**/*.md"

# 带选项运行
node dist/index.js "docs/**/*.md" --timeout 3000 --verbose --concurrency 10

# JSON 输出（可配合 jq 使用）
node dist/index.js README.md --json
```

### 命令行选项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `--timeout <ms>` | 5000 | 请求超时时间（毫秒） |
| `--verbose` | false | 显示详细的状态码和错误信息 |
| `--concurrency <n>` | 5 | 并发 HTTP 请求数 |
| `--json` | false | 以 JSON 格式输出结果 |

### 退出码

| 退出码 | 含义 |
|--------|------|
| 0 | 所有链接均可访问 |
| 1 | 存在不可访问或超时的链接 |

## 开发

```bash
# 安装依赖
npm install

# 编译 TypeScript
npm run build

# 运行测试
npm test
```

## 项目结构

```
mdlink-check/
├── src/
│   ├── index.ts        # CLI 入口（commander）
│   ├── parser.ts       # 从 Markdown 提取链接
│   ├── checker.ts      # HTTP HEAD/GET 链接验证
│   └── reporter.ts     # 彩色输出格式化
├── tests/
│   ├── parser.test.ts  # 7 个测试用例
│   ├── checker.test.ts # 5 个测试用例
│   └── integration.test.ts # 3 个测试用例
└── fixtures/
    └── sample.md       # 包含好链接和坏链接的测试文件
```

## 技术栈

- **语言**: TypeScript（严格模式，ESM）
- **CLI 框架**: commander
- **HTTP 请求**: 原生 fetch（Node 18+）
- **终端输出**: chalk
- **测试框架**: vitest
- **CI**: GitHub Actions（Node 18/20/22）

## 项目背景

本项目通过 **Opus 4.6 架构师 + Codex CLI 实现者** 两层 AI 协作工作流构建：

- **Claude Code (Opus 4.6)** 负责：规划架构、定义接口、制定验收条件、代码审查
- **Codex CLI (gpt-5.3-codex)** 负责：具体代码实现

4 轮迭代全部一次通过，详见 [PLAN.md](./PLAN.md)。

## 相关文档

- [PLAN.md](./PLAN.md) — 项目架构决策和实施记录（中文）
- [PROJECT-MANAGEMENT-GUIDE.md](./PROJECT-MANAGEMENT-GUIDE.md) — 项目代码管理完整教学指南（中文）

## 许可证

MIT

---

*最后更新：2026-03-22*
