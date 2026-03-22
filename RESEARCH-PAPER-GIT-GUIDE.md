# 论文项目 Git 版本管理方案

> 将软件工程的版本管理实践应用于学术研究，实现 **代码 + 数据 + 手稿** 的全流程可追溯、可复现管理。

---

## 目录

1. [为什么论文项目需要版本管理](#1-为什么论文项目需要版本管理)
2. [仓库结构设计](#2-仓库结构设计)
3. [Commit 规范（论文版）](#3-commit-规范论文版)
4. [分支策略（实验驱动）](#4-分支策略实验驱动)
5. [Git Tag 标记关键里程碑](#5-git-tag-标记关键里程碑)
6. [.gitignore 配置](#6-gitignore-配置)
7. [大文件管理策略](#7-大文件管理策略)
8. [CI 自动化（可选）](#8-ci-自动化可选)
9. [与软件项目的映射关系](#9-与软件项目的映射关系)
10. [完整工作流示例](#10-完整工作流示例)
11. [常见问题与最佳实践](#11-常见问题与最佳实践)

---

## 1. 为什么论文项目需要版本管理

### 1.1 研究中的常见痛点

| 痛点 | 没有版本管理 | 有版本管理 |
|------|------------|-----------|
| "昨天跑的实验结果更好，但代码被覆盖了" | 找不回来 | `git log` → `git checkout` 精准回退 |
| "这段话是谁改的？为什么改？" | 不知道 | `git blame` 逐行追溯改动来源 |
| "导师说改回第二版的方法描述" | 到处找 `v2-final-真的final.docx` | `git diff v2..v3 -- manuscript/` |
| "这个图是哪个版本的代码画的？" | 代码和图对不上 | 同一个 commit 中代码和图一一对应 |
| "电脑坏了 / 硬盘挂了" | 全部丢失 | GitHub 上有完整备份 |
| "审稿人问实验能不能复现" | 环境早就变了 | tag + 锁定依赖 = 精确复现 |

### 1.2 核心理念

> **论文 = 代码 + 数据 + 文字，三者同步版本化，才能实现真正的可复现研究。**

版本管理不仅是备份工具，更是**研究日志**：每个 commit 记录了你在什么时间、做了什么改动、为什么做。

---

## 2. 仓库结构设计

### 2.1 推荐目录结构

```
my-paper/
├── .github/
│   └── workflows/
│       └── ci.yml               # CI：自动编译论文 + 跑测试
├── manuscript/                   # 手稿
│   ├── main.md                   # 主文（或 main.tex）
│   ├── abstract.md
│   ├── introduction.md
│   ├── methods.md
│   ├── results.md
│   ├── discussion.md
│   ├── supplementary.md          # 补充材料
│   └── references.bib            # 参考文献
├── experiments/                   # 实验代码
│   ├── train.py
│   ├── evaluate.py
│   ├── utils.py
│   └── configs/
│       ├── baseline.yaml          # 基线实验配置
│       ├── proposed.yaml          # 提出方法的配置
│       └── ablation_xxx.yaml      # 消融实验配置
├── analysis/                      # 数据分析 & 绘图
│   ├── plot_figure1.py
│   ├── plot_figure2.py
│   ├── plot_figure3.py
│   └── statistics.py              # 统计检验
├── figures/                       # 最终图表（PDF/SVG）
│   ├── figure1.pdf
│   ├── figure2.pdf
│   └── table1.tex
├── data/                          # 处理后的小数据
│   ├── results_baseline.csv
│   ├── results_proposed.csv
│   └── README.md                  # 数据说明 + 下载链接
├── scripts/                       # 辅助脚本
│   ├── download_data.sh           # 下载原始数据
│   ├── setup_env.sh               # 环境搭建
│   └── run_all_experiments.sh     # 一键跑全部实验
├── .gitignore
├── README.md                      # 项目说明
├── requirements.txt               # Python 依赖（或 environment.yml）
└── Makefile                       # 一键构建：跑实验 → 绘图 → 编译论文
```

### 2.2 设计原则

| 原则 | 说明 |
|------|------|
| **分离关注点** | 实验代码、分析脚本、手稿各自独立目录 |
| **可复现** | 任何人 clone 后，按 README 步骤即可复现全部结果 |
| **最终产物入库** | figures/ 里放最终版图表，随 commit 一起版本化 |
| **中间产物不入库** | checkpoint、wandb log、原始大数据集用 .gitignore 排除 |

### 2.3 Makefile 示例

```makefile
.PHONY: all experiments figures paper clean

all: experiments figures paper

experiments:
	python experiments/train.py --config experiments/configs/baseline.yaml
	python experiments/train.py --config experiments/configs/proposed.yaml
	python experiments/evaluate.py --output data/

figures:
	python analysis/plot_figure1.py
	python analysis/plot_figure2.py
	python analysis/plot_figure3.py

paper:
	# Markdown → PDF（使用 pandoc）
	pandoc manuscript/main.md -o paper.pdf --bibliography=manuscript/references.bib
	# 或 LaTeX
	# cd manuscript && latexmk -pdf main.tex

clean:
	rm -f data/results_*.csv figures/*.pdf paper.pdf
```

---

## 3. Commit 规范（论文版）

### 3.1 Type 定义

| Type | 含义 | 示例 |
|------|------|------|
| `exp` | 实验相关（改代码/配置/跑新实验） | `exp: add contrastive loss, +2.3% on CIFAR-10` |
| `fig` | 图表更新 | `fig: regenerate Figure 3 with updated colormap` |
| `ms` | 手稿修改 | `ms: rewrite Methods section per reviewer #2` |
| `data` | 数据处理 | `data: preprocess ImageNet validation split` |
| `ref` | 参考文献 | `ref: add 5 papers from ICML 2025` |
| `review` | 审稿修改 | `review: address R1 comment on statistical significance` |
| `analysis` | 数据分析/统计 | `analysis: add paired t-test for Table 2` |
| `env` | 环境/依赖 | `env: pin PyTorch to 2.3.0 for reproducibility` |
| `chore` | 杂项（脚本、配置） | `chore: add download script for CelebA dataset` |

### 3.2 好的 commit message 示例

```
exp: add dropout ablation on 3 datasets

Tested dropout rates [0.1, 0.3, 0.5] on CIFAR-10, CIFAR-100, ImageNet.
Best: 0.3 across all datasets. Results in data/ablation_dropout.csv.
```

```
ms: rewrite abstract to emphasize novelty

Shortened from 250 to 180 words. Moved contribution list to intro.
Addressed advisor feedback from 2026-03-20 meeting.
```

```
review: address R2 concern about dataset bias

- Added gender/age distribution analysis (Figure S3)
- Added fairness metrics to Table 4
- Updated Discussion section paragraph 3
```

### 3.3 Commit 粒度建议

| 场景 | 粒度 |
|------|------|
| 跑了一轮新实验 | 一个 commit：代码改动 + 配置 + 结果数据 + 更新的图 |
| 改了一个章节 | 一个 commit：该章节的 .md 文件 |
| 审稿修改 | 每个审稿人的意见一个 commit（或每条 comment 一个） |
| 修了个 bug | 一个 commit：bug fix + 受影响的结果更新 |

---

## 4. 分支策略（实验驱动）

### 4.1 分支模型

```
main ──────●────────●──────────────●───────●───── (随时可提交的状态)
            \      /                \     /
     exp/new-loss ●      exp/ablation-dropout ●
            \
     exp/transformer-backbone ──●──● (失败，未合并)
```

### 4.2 分支命名规范

```
exp/xxx          — 实验分支（新方法、新配置、消融实验）
ms/xxx           — 手稿修改分支（大规模重写、版本迭代）
review/round-N   — 审稿修改分支
fig/xxx          — 图表重做分支
hotfix/xxx       — 紧急修复
```

### 4.3 实际操作流程

```bash
# === 尝试新的 loss function ===

# 1. 从 main 创建实验分支
git checkout main
git checkout -b exp/contrastive-loss

# 2. 修改代码、跑实验
vim experiments/train.py          # 添加新 loss
vim experiments/configs/cl.yaml    # 新配置
python experiments/train.py --config experiments/configs/cl.yaml
python experiments/evaluate.py --output data/results_cl.csv
python analysis/plot_figure2.py    # 更新对比图

# 3. 提交（代码 + 数据 + 图一起提交，保证对应关系）
git add experiments/ data/results_cl.csv figures/figure2.pdf
git commit -m "exp: add contrastive loss, +2.3% accuracy on CIFAR-10"

# 4a. 结果好 → 合并回 main
git checkout main
git merge exp/contrastive-loss
git branch -d exp/contrastive-loss

# 4b. 结果不好 → 保留分支但不合并（日后可能参考）
git checkout main
# 分支留着，不删除
```

### 4.4 审稿修改的分支策略

```bash
# 收到审稿意见后
git checkout main
git tag submitted-v1              # 先标记提交版本
git checkout -b review/round-1    # 创建修改分支

# 逐条修改
git commit -m "review: R1.1 - add statistical significance test to Table 2"
git commit -m "review: R1.2 - clarify loss function formulation in Eq. 3"
git commit -m "review: R2.1 - add ablation study on learning rate"
git commit -m "review: R2.3 - fix typo in Section 4.2"
git commit -m "ms: update rebuttal letter"

# 完成后合并
git checkout main
git merge review/round-1
git tag revision-1
```

---

## 5. Git Tag 标记关键里程碑

### 5.1 论文生命周期标签

```bash
git tag draft-v1            # 初稿完成
git tag internal-review     # 导师审阅版
git tag submitted-v1        # 首次投稿
git tag revision-1          # 第一轮修改
git tag revision-2          # 第二轮修改（如有）
git tag camera-ready        # 终稿
git tag published            # 正式发表

# 推送标签到远程
git push --tags
```

### 5.2 标签的威力

```bash
# 对比投稿版和修改版的手稿差异
git diff submitted-v1..revision-1 -- manuscript/

# 恢复投稿时的实验代码（用于复现审稿人质疑的结果）
git checkout submitted-v1 -- experiments/

# 查看从投稿到终稿改了哪些文件
git diff --stat submitted-v1..camera-ready

# 导出某个版本的完整快照
git archive --format=zip camera-ready -o paper-camera-ready.zip
```

---

## 6. .gitignore 配置

```gitignore
# === 大文件 / 原始数据 ===
data/raw/                    # 原始大数据集（用链接或 DVC 管理）
*.ckpt                       # 模型 checkpoint
*.pth
*.pt
*.h5
*.safetensors

# === 实验日志平台 ===
wandb/
mlruns/
lightning_logs/
tensorboard/

# === Python ===
__pycache__/
*.pyc
*.pyo
.venv/
env/
*.egg-info/

# === LaTeX 编译产物 ===
*.aux
*.bbl
*.blg
*.log
*.out
*.synctex.gz
*.fdb_latexmk
*.fls
*.toc
*.lof
*.lot

# === Jupyter ===
.ipynb_checkpoints/

# === 系统文件 ===
.DS_Store
Thumbs.db

# === IDE ===
.vscode/
.idea/
```

### 什么应该入库，什么不应该

| 应该入库 | 不应该入库 |
|---------|-----------|
| 实验代码 (`experiments/`) | 模型权重 (`*.ckpt`, `*.pth`) |
| 配置文件 (`configs/`) | 原始大数据集 (`data/raw/`) |
| 分析脚本 (`analysis/`) | wandb / tensorboard 日志 |
| 处理后的小数据 (`data/results_*.csv`) | Python 缓存 (`__pycache__/`) |
| 最终图表 (`figures/*.pdf`) | LaTeX 编译中间文件 |
| 手稿文本 (`manuscript/`) | 虚拟环境 (`.venv/`) |
| 依赖声明 (`requirements.txt`) | IDE 配置 |

---

## 7. 大文件管理策略

Git 仓库不适合存储大文件（>100MB）。针对不同类型的大文件，有不同的解决方案：

### 7.1 方案对比

| 方案 | 适用场景 | 复杂度 |
|------|---------|--------|
| **README 写链接** | 公开数据集 | 最简单 |
| **下载脚本** | 需要预处理的数据 | 简单 |
| **Git LFS** | 单个大文件（模型权重、PDF） | 中等 |
| **DVC** | 数据集版本管理 + 云存储 | 较复杂 |

### 7.2 方案一：README + 下载脚本（推荐起步）

`data/README.md`：
```markdown
# 数据说明

## 原始数据
- CIFAR-10: https://www.cs.toronto.edu/~kriz/cifar.html
- 运行 `scripts/download_data.sh` 自动下载并解压

## 处理后的数据
- `results_baseline.csv` — 基线实验结果（已入库）
- `results_proposed.csv` — 提出方法的结果（已入库）
```

`scripts/download_data.sh`：
```bash
#!/bin/bash
mkdir -p data/raw
cd data/raw
wget https://www.cs.toronto.edu/~kriz/cifar-10-python.tar.gz
tar xzf cifar-10-python.tar.gz
rm cifar-10-python.tar.gz
echo "Data downloaded to data/raw/"
```

### 7.3 方案二：Git LFS

```bash
# 安装
brew install git-lfs
git lfs install

# 追踪特定类型的大文件
git lfs track "*.pth"
git lfs track "figures/*.png"
git add .gitattributes

# 之后正常 git add/commit/push，大文件自动通过 LFS 管理
```

### 7.4 方案三：DVC（数据版本控制）

```bash
# 安装
pip install dvc dvc-s3  # 或 dvc-gs, dvc-gdrive

# 初始化
dvc init

# 追踪数据目录
dvc add data/raw/cifar10/
git add data/raw/cifar10.dvc .gitignore

# 推送数据到远程存储
dvc remote add -d myremote s3://my-bucket/dvc-storage
dvc push

# 其他人拉取数据
dvc pull
```

---

## 8. CI 自动化（可选）

### 8.1 论文项目的 CI 能做什么

| CI 任务 | 作用 |
|---------|------|
| 编译论文 | 确保 LaTeX/Markdown 能正确编译 |
| 跑轻量测试 | 验证数据处理脚本不报错 |
| 生成图表 | 自动从数据生成最新版图表 |
| 拼写检查 | 自动检查手稿拼写和语法 |
| 生成 PDF artifact | 每次 push 自动编译 PDF 供下载 |

### 8.2 示例：GitHub Actions

```yaml
name: Paper CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-paper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run analysis scripts (smoke test)
        run: |
          python analysis/plot_figure1.py --check-only
          python analysis/statistics.py --check-only

      - name: Build paper (Pandoc)
        run: |
          sudo apt-get install -y pandoc
          pandoc manuscript/main.md -o paper.pdf --bibliography=manuscript/references.bib

      - name: Upload PDF
        uses: actions/upload-artifact@v4
        with:
          name: paper-pdf
          path: paper.pdf
```

---

## 9. 与软件项目的映射关系

| 软件项目 | 论文项目 | 对应关系 |
|---------|---------|---------|
| `src/` 源代码 | `experiments/` 实验代码 | 核心产出 |
| `tests/` 自动化测试 | 实验可复现性验证 | 质量保证 |
| `README.md` 项目说明 | `manuscript/` 手稿 | 面向读者的产出 |
| `npm run build` 编译 | `make experiments && make paper` | 构建流程 |
| `npm test` 测试 | 检查实验结果一致性 | 自动化验证 |
| feature 分支 | `exp/` 实验分支 | 隔离探索 |
| PR + CI | 实验完成后合并 + 检查可复现 | 质量门禁 |
| `v1.0.0` 语义化版本 | `submitted`, `revision-1`, `camera-ready` 标签 | 里程碑 |
| `package.json` 依赖声明 | `requirements.txt` / `environment.yml` | 环境可复现 |
| `.github/workflows/ci.yml` | 论文编译 + 轻量验证 CI | 自动化 |

---

## 10. 完整工作流示例

### 10.1 项目启动

```bash
# 创建仓库
mkdir my-nce-paper && cd my-nce-paper
git init

# 创建目录结构
mkdir -p manuscript experiments/configs analysis figures data scripts .github/workflows

# 初始化 Python 环境
python -m venv .venv
source .venv/bin/activate
pip install torch numpy matplotlib pandas scipy
pip freeze > requirements.txt

# 创建 .gitignore（参考第 6 节）
# 创建 README.md

# 首次提交
git add .
git commit -m "chore: initialize paper project structure"

# 推送到 GitHub（私有仓库）
gh repo create my-nce-paper --private --source=. --push
```

### 10.2 实验阶段

```bash
# 基线实验
git checkout -b exp/baseline
# ... 写代码、跑实验 ...
git add experiments/ data/results_baseline.csv figures/
git commit -m "exp: baseline results on CIFAR-10/100, acc 78.2%/52.1%"
git checkout main && git merge exp/baseline

# 提出方法
git checkout -b exp/proposed-method
# ... 实现新方法 ...
git commit -m "exp: proposed NCE method, +3.5% on CIFAR-10"
# ... 调参优化 ...
git commit -m "exp: tune temperature param, best=0.07, +0.8% additional"
git checkout main && git merge exp/proposed-method

# 消融实验
git checkout -b exp/ablation
# ... 跑消融 ...
git commit -m "exp: ablation on loss components, all 3 terms needed"
git checkout main && git merge exp/ablation
```

### 10.3 写作阶段

```bash
# 可以直接在 main 上写（小改动）
git commit -m "ms: draft Introduction with motivation and contributions"
git commit -m "ms: write Methods section with algorithm description"
git commit -m "ms: write Results section with Tables 1-3"
git commit -m "fig: generate all figures from latest experiment data"
git commit -m "ms: write Discussion and Conclusion"
git commit -m "ref: compile bibliography, 42 references"

# 大规模重写用分支
git checkout -b ms/rewrite-intro
# ... 重写 ...
git commit -m "ms: rewrite Introduction to focus on scalability"
git checkout main && git merge ms/rewrite-intro
```

### 10.4 投稿

```bash
# 标记投稿版本
git tag submitted-v1
git push --tags

# 可选：创建 GitHub Release
gh release create submitted-v1 paper.pdf --title "Submitted to ICML 2026"
```

### 10.5 审稿修改

```bash
# 创建修改分支
git checkout -b review/round-1

# 逐条回应审稿意见
git commit -m "review: R1.1 - add statistical significance test to Table 2"
git commit -m "review: R1.2 - clarify loss function in Eq. 3"
git commit -m "review: R2.1 - add learning rate ablation (Table S1)"
git commit -m "review: R2.3 - fix notation inconsistency in Section 3"
git commit -m "exp: re-run with 5 random seeds for error bars"
git commit -m "fig: update all figures with error bars"
git commit -m "ms: write rebuttal letter"

# 合并并标记
git checkout main
git merge review/round-1
git tag revision-1
git push && git push --tags
```

### 10.6 终稿发表

```bash
git commit -m "ms: final camera-ready formatting"
git tag camera-ready
git push --tags

# 发表后公开仓库（如需要）
gh repo edit --visibility public
```

---

## 11. 常见问题与最佳实践

### Q: Markdown 还是 LaTeX？

| | Markdown | LaTeX |
|---|---------|-------|
| 优点 | Git diff 友好、轻量、易读 | 排版精美、公式强大、期刊模板多 |
| 缺点 | 复杂排版受限 | diff 噪音多、学习曲线陡 |
| 适合 | 初稿、内部文档、预印本 | 正式投稿、数学密集型论文 |
| 建议 | 用 Pandoc 转换为最终格式 | 每句话独占一行，优化 git diff |

**LaTeX 优化 git diff 的技巧**：每句话一行，而不是整段一行。这样改一句话只影响一行 diff。

### Q: 需要把 PDF 放入 git 吗？

- **figures/*.pdf** → 建议入库（是最终产物，保证图和代码对应）
- **paper.pdf**（编译产物）→ 不入库，用 CI 自动生成或 `make paper`
- 如果 PDF 很大，用 Git LFS

### Q: 一个人也需要用分支吗？

**需要**。最大的好处不是协作，而是：
- 实验失败可以整个丢弃，不污染 main
- 多条实验路线可以并行探索
- `git log main` 只看最终保留的实验，历史清晰

### Q: 多久 commit 一次？

| 事件 | 立即 commit |
|------|------------|
| 实验跑完，有了结果数据 | ✅ |
| 完成一个章节的草稿 | ✅ |
| 修复了代码 bug | ✅ |
| 更新了一张图 | ✅ |
| 写了两行就去吃饭 | ❌ 用 `git stash` |

**原则**：每个 commit 应该是一个有意义的、可独立理解的变更。

### Q: 私有还是公开仓库？

| 阶段 | 建议 |
|------|------|
| 研究进行中 | **Private** — 防止被抢先 |
| 论文发表后 | **Public** — 增加引用、促进可复现研究 |
| 有专利考虑 | **Private** — 咨询技术转移办公室 |

---

## 附录：快速启动模板

一条命令创建论文项目骨架：

```bash
mkdir my-paper && cd my-paper && git init && \
mkdir -p manuscript experiments/configs analysis figures data scripts .github/workflows && \
echo "node_modules/\n.venv/\ndata/raw/\n*.ckpt\n*.pth\nwandb/\n__pycache__/\n.DS_Store" > .gitignore && \
echo "# My Paper\n\nTODO: Add description" > README.md && \
git add . && git commit -m "chore: initialize paper project structure"
```

---

*最后更新：2026-03-22*
