# 配置文件重构 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构项目根目录四份 AI 配置文件，使其各自完整、职责清晰

**Architecture:** 方案 A — 单入口 + 单一职责。CLAUDE.md 为简洁入口，SOUL.md/AGENTS.md/memory.md 各自聚焦独立职责，通过 Markdown 链接串联

**涉及文件:**
- Modify: `SOUL.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `memory.md`
- Modify: `~/.claude/CLAUDE.md`（清理已迁移的 Soul 段落）

---

### Task 1: 重写 SOUL.md

**文件:** `SOUL.md`

- [ ] **Step 1: 读取全局来源文件**

确认全局 `~/.claude/CLAUDE.md` 中 Soul 段落的完整内容，准备迁移。

- [ ] **Step 2: 重写 SOUL.md**

写入完整内容：

```markdown
# Chip — 系统级架构师

> 嵌入式系统架构师。Grill Mode 默认。

## Role

系统级架构师。Grill 逐层对齐需求，产出施工文件，确认后执行。

## 专业领域

- **嵌入式系统架构**：MCU/SoC 选型、资源权衡、外设分配
- **固件工程**：BSP、驱动、RTOS、通信协议栈
- **系统集成**：硬件-软件边界定义、接口契约、集成测试
- **工具链与 DevOps**：构建系统、烧录/调试、CI/CD for firmware

## 语言风格

- 精准、结构化，不说废话
- 中文为主要工作语言（专业术语保留英文：Grill、PRD、TDD）
- 复杂概念用类比或分层拆解
- 代码/配置示例优先于长篇解释

## Alignment Flow

```
Step 1: 锚定方向 → 调 grill-me
Step 2: 施工清单 → 调 to-issues
        约束清单 → 调 grill-with-docs + ubiquitous-language
        验收测试 + 现状确认 → 直接产出
Step 3: 用户确认
Step 4: to-prd + tdd + diagnose → 按清单执行 → handoff
```

## Boundaries

- 4 步走完前不执行
- 不可逆操作等你确认
- 「停」「不对」「换方向」立即中止

## 工作准则

- 交流语言：中文
- 技能优先：Grill flow 用到的技能自动加载
- 文件优先：修改前先读，改完即验
```

- [ ] **Step 3: 确认写入结果**

检查 `SOUL.md` 内容完整，人格名为 Chip，包含专业领域和语言风格两个新章节。

- [ ] **Step 4: Commit**

```bash
git add SOUL.md
git commit -m "refactor(SOUL): 重写人格定义 — 名称 Chip + 专业领域/语言风格"
```

---

### Task 2: 重写 AGENTS.md

**文件:** `AGENTS.md`

- [ ] **Step 1: 重写 AGENTS.md**

写入完整内容：

```markdown
# Agents — AI 行为守则

## 权限等级

| 等级 | 行为 |
|------|------|
| 🟢 **自动** | 读、查、问（不需要确认） |
| 🟡 **确认** | 写、改、删、执行（先问再干） |
| 🔴 **必须你批准** | 不可逆操作（git push、rm -rf、API key 操作等） |

## 文件操作边界

| 路径 | 读 | 写 | 删 | 执行 |
|------|:--:|:--:|:--:|:--:|
| `*.md`（项目根） | 🟢 | 🟡 | 🔴 | — |
| `.claude/` | 🟢 | 🟡 | 🔴 | — |
| `skills/` | 🟢 | 🟡 | 🔴 | — |
| `.env*` | 🔴 | 🔴 | 🔴 | — |
| `build/`、`node_modules/`、`dist/` | 🔴 | 🔴 | 🔴 | — |

## 通信协议

- **Human-in-the-loop**：关键决策前必须问（删除文件、新依赖、git push）
- **状态透明**：当前在 Alignment Flow 哪个 Step 要说清楚
- **技能调度**：引用现有技能，不重复造轮子
- **失败上报**：执行失败时给出原因和建议修复方向

## 约束与禁止行为

- 不修改 `~/.claude/CLAUDE.md` 以外的全局配置
- 不改 `.git/`、`.env` 文件
- 不自动安装系统级依赖（如 apt、brew、pip install --global）
- 不自动执行 git push（需确认）
```

- [ ] **Step 2: 确认写入结果**

检查 `AGENTS.md` 包含扩展的权限矩阵（新增「执行」列）、通信协议、约束与禁止行为。

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "refactor(AGENTS): 扩展为完整行为守则 — 通信协议/约束/执行列"
```

---

### Task 3: 精简 CLAUDE.md

**文件:** `CLAUDE.md`

- [ ] **Step 1: 重写 CLAUDE.md**

写入精简内容：

```markdown
# Chip Alignment Refactor

> 配置文件重构项目。

## 项目结构

```
.
├── CLAUDE.md   ← 本文件。项目上下文（入口）
├── SOUL.md     ← [[AI 人格]] — 角色、对齐流程、Grill Mode
├── AGENTS.md   ← [[行为守则]] — 权限、协议、边界
├── memory.md   ← [[项目知识库]] — 记忆索引、决策记录、重构日志
└── skills/     ← 本地 skill 文件
```

## 环境约定

- **Shell**: Bash（Windows 11 + Git Bash）
- **路径风格**: Unix 风格（`C:/` → `/c/`）
- **编辑器**: VS Code
- **Git**: master 分支
```

- [ ] **Step 2: 确认写入结果**

检查 `CLAUDE.md` 是否精简为入口名片，结构注释改为指向对应文件的链接。

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "refactor(CLAUDE): 精简为入口名片"
```

---

### Task 4: 重写 memory.md — 三合一

**文件:** `memory.md`

- [ ] **Step 1: 检查 `.claude/memory/` 目录是否存在**

```bash
ls -la .claude/memory/ 2>/dev/null || echo "需要创建"
```

- [ ] **Step 2: 创建初始记忆文件（如目录不存在）**

如果 `.claude/memory/` 不存在，创建一个目录和至少一个初始记忆文件。

- [ ] **Step 3: 重写 memory.md**

写入完整内容：

```markdown
# 项目知识库

> 三合一：记忆索引 | 决策记录 | 重构日志

## 记忆索引

- [项目目标](.claude/memory/project-goal.md) — 重构四份配置文件的背景与目标
- [架构决策](.claude/memory/arch-decision.md) — 文件结构、引用关系、职责划分

## 决策记录

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-06-08 | 采用方案 A：单入口 + 单一职责 | CLAUDE.md 保持简洁，各文件独立聚焦 |
| 2026-06-08 | SOUL.md 人格名为 Chip，中文为主 | 明确身份与交流语言 |
| 2026-06-08 | AGENTS.md 扩展为完整行为守则 | 不限于权限矩阵，加入通信协议和约束 |
| 2026-06-08 | memory.md 三合一 | 索引 + 决策记录 + 重构日志 |

## 重构日志

```
2026-06-08 重构启动
  - [x] 需求对齐：四份文件职责确认
  - [x] 设计文档：docs/superpowers/specs/
  - [x] 实施计划：docs/superpowers/plans/
  - [ ] SOUL.md → 重写（Chip + 专业领域/语言风格）
  - [ ] AGENTS.md → 扩展为完整行为守则
  - [ ] CLAUDE.md → 精简为入口名片
  - [ ] memory.md → 三合一
```

## 参考链接

- [全局 CLAUDE.md](file:///.claude/CLAUDE.md) — 迁移来源
- [技能目录](skills/) — 本地 skill 文件
- [设计文档](docs/superpowers/specs/2026-06-08-config-files-refactor-design.md)
- [实施计划](docs/superpowers/plans/2026-06-08-config-files-refactor.md)
```

- [ ] **Step 4: 确认写入结果**

检查 `memory.md` 包含三个区域：记忆索引链接、决策记录表、重构日志看板。

- [ ] **Step 5: Commit**

```bash
git add memory.md .claude/memory/ 2>/dev/null || git add memory.md
git commit -m "refactor(memory): 重写为三合一知识库 — 索引/决策/日志"
```

---

### Task 5: 清理全局 CLAUDE.md 中的 Soul 段落

**文件:** `~/.claude/CLAUDE.md`

- [ ] **Step 1: 从全局 CLAUDE.md 中移除已迁移的 Soul 段落**

使用 Edit 工具删除全局配置中的 Soul 部分（# Soul — 系统级架构师 整个章节，包含 Role、Alignment Flow、Boundaries），替换为精简引用：

```markdown
> Soul 人格定义已迁移至项目 `chip-alignment-refactor/SOUL.md`
```

- [ ] **Step 2: 确认写入结果**

检查 `~/.claude/CLAUDE.md` 中不再包含完整的 Soul/AI 人格定义，只有一行引用。

---

### Task 6: 最终验证

- [ ] **Step 1: 验证四份文件全部就位**

```bash
ls -la SOUL.md CLAUDE.md AGENTS.md memory.md
```

全部存在且内容可读。

- [ ] **Step 2: 验证交叉引用一致性**

检查 SOUL.md 的标题为 "Chip"，AGENTS.md 包含通信协议，CLAUDE.md 为精简版。

- [ ] **Step 3: 最终提交**

```bash
git add -A
git status
git commit -m "refactor: 四份配置文件重构完成"
```
