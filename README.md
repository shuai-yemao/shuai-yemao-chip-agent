# Chip — 五层 Agent 系统

> **系统级 AI 架构师** — 一个可编程、可编排、可记忆的多层 Agent 系统  
> 专为 Claude Code 设计，覆盖从需求对齐到执行交付的完整链路

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Claude%20Code-blue)
![Version](https://img.shields.io/badge/version-2.0.0-green)

---

## 目录

- [设计思路](#设计思路)
- [系统架构](#系统架构)
- [新特性](#新特性)
- [工作流程](#工作流程)
- [文件夹结构](#文件夹结构)
- [快速开始](#快速开始)
- [使用方法](#使用方法)
- [许可](#许可)

---

## 设计思路

### 核心问题

AI 编程助手面临几个固有矛盾：

| 矛盾 | 说明 |
|------|------|
| **模糊需求 vs 精确执行** | 用户说"做个 LED 控制"，但需要确定引脚、频率、模式等几十个参数 |
| **自由行动 vs 安全边界** | Agent 能写能删，但哪些操作需要确认？哪些绝对不能做？ |
| **单线程 vs 并行效率** | 大任务拆成子任务后，串行太慢，但并行需要编排和门禁 |
| **短会话 vs 长期记忆** | 每次对话都是新的，但过去踩过的坑应该被记住 |

### 五层解耦

Chip 用**五层架构**分别解决这些矛盾，每一层只关注自己的职责：

```
                用户模糊需求
                      │
                      ▼
            ┌─────────────────────┐
            │   需求对齐层         │  ← 把模糊变精确
            │   (Guide Mode)      │     输出 chain + action_items + state
            └────────┬────────────┘
                     │
            ┌────────▼────────────┐
            │     安全层           │  ← 可编程安全护栏
            │   (Safety Layer)    │     预检/审计/脱敏/异常检测
            └────────┬────────────┘
                     │
            ┌────────▼────────────┐
            │     编排层           │  ← DAG 分批 + Skill 推荐 + 手动 TDD
            │   (Orchestration)   │     chain.on_completion → 记忆层
            └────────┬────────────┘
                     │
            ┌────────▼────────────┐
            │     记忆层           │  ← 跨会话持久化
            │   (Memory Layer)    │     搜索/读写/Codegraph 索引
            └─────────────────────┘

  ┌─────────────────────┐  ┌─────────────────────┐
  │     工具层           │  │     Ops 层           │
  │  技能包管理器        │  │  系统运维 + 打包分发  │
  │  list/map/install   │  │  health/backup/doctor │
  └─────────────────────┘  └─────────────────────┘
```

### 设计原则

1. **逐层门禁** — 每层为下一层提供确定性输入，不上交模糊性
2. **正交管理平面** — 工具层和 Ops 层不参与管线，分别管理技能和系统
3. **链式触发** — 每层输出 `chain` 元数据，自动串联后续步骤
4. **推理步骤清单** — 每层输出 `action_items[]`，结构化指引主 agent
5. **共享状态** — 每层输出 `state.produced`，层间数据传递透明可追踪
6. **编程安全护栏** — AGENTS.md 编码为可执行的安全规则，而非建议
7. **Diff + 确认** — 更新/恢复等操作先预览再执行，不静默变更

---

## 系统架构

### 1. 需求对齐层（Guide Mode）

**文件**: `workflows/requirements-alignment.js`

将用户模糊需求转化为精确的施工清单。采用"Grill 模式"——像烧烤一样反复翻面追问，直到需求两面焦黄清晰。

**流程**:
```
Step 1: grill-me          → 一问一答逐条追问，锚定方向
Step 2: grill-with-docs   → 对照文档和 PRD 梳理约束
Step 2.5: 六源对齐审查    → Skills / Web / GitHub / 记忆 / 真伪验证
Step 3: 4 张施工清单      → 现状 / 约束 / 文件 / 验收（全部需确认）
Step 4: to-issues         → 拆解为可执行的垂直切片
```

**输出**: `chain.flow.next_conversations[4]` + `action_items[5]` + `state.produced`

### 2. 安全层（Safety Layer）

**文件**: `workflows/safety-layer.js`

将 AGENTS.md 中的 9 大规则体系编码为可编程安全护栏。所有操作经此层预检后才能执行。

**能力**:
- **预检** — 执行前检查文件权限、操作风险、领域约束
- **权限控制** — 文件访问白名单、命令执行黑名单
- **高危确认** — 嵌入式专属（烧录/改 linker script/配置时钟等）
- **隐私过滤** — API Key / Token / 芯片 UID 自动脱敏
- **审计日志** — 所有高危操作记录可追溯
- **异常检测** — 模式识别（高频高危/权限试探/信息外泄）

### 3. 编排层（Orchestration）

**文件**: `workflows/agent-orchestration.js`

DAG 调度 + Skill 推荐 + 手动 TDD 流程管理。

**特性**:
- DAG 依赖解析（拓扑排序分批）
- Phase 0.5 安全预检（每批调用 safety-layer）
- Skill 推荐（每个任务按 techniques 匹配领域技能）
- 手动 TDD 指引（主 agent + 用户协作）
- 验收判决跟踪（逐条记录 verdict）
- Phase 2.5 审计日志（每批写入 safety-layer）
- 完成链路（全部通过 → memory-layer save + safety-layer audit）

### 4. 记忆层（Memory Layer）

**文件**: `workflows/memory-layer.js`

跨会话持久化记忆，解决 LLM 的"金鱼记忆"问题。

**操作**:
- `search` — 语义搜索历史经验
- `read` / `write` — 单条记忆读写（write 支持 Codegraph 符号自动索引）
- `context` — 为当前任务检索相关记忆并注入上下文
- `list` — 列出所有记忆索引

### 5. 工具层（Tool Layer）

**文件**: `workflows/tool-layer.js`

技能包管理器，管理 `~/.claude/skills/` 下所有技能包的**生命周期**。

**操作**:
- `list` — 列出所有技能（registered / orphaned / archived）
- `map` — 技能分类地图（10 个分类 × 53+ 技能，含 20 条任务推荐）
- `map category="通信协议"` — 筛选查看某一分类
- `map task="I2C"` — 按任务推荐技能
- `install` — 从 Git URL 安装新技能
- `remove` — 卸载技能（检查反向依赖）
- `update` — diff + 确认模式更新
- `deps-tree` — 依赖关系分析
- `adopt` — 收养已有技能到工具层管理

### 6. Ops 层（Ops Layer）

**文件**: `workflows/ops-layer.js`

系统运维 + 打包分发，管理 `~/.claude/` 整体的生命周期。

**操作**:
- `health` — 系统健康检查（代理/环境/钩子/Workflow/技能/记忆）
- `backup` — 全量备份
- `restore` — 从备份恢复（dry-run 预览）
- `package` — 打包为可移植安装包
- `deploy` — 远程部署
- `doctor` — 诊断 + 自动修复
- `prune` — 清理过期数据

---

## 新特性

### P0: 链式触发（Chain Triggers）

每个 Workflow 输出包含 `chain` 元数据，主 agent 按指引自动串联步骤和工作流：

| 链类型 | 源 | 目标 | 条件 |
|--------|-----|------|------|
| 会话指引 | requirements-alignment → 4 步对话 | 输出即触发 |
| 数据转发 | requirements-alignment → agent-orchestration | 清单确认后 |
| 完成链路 | agent-orchestration → memory-layer + safety-layer | 全部验收通过 |
| 部分链路 | agent-orchestration → memory-layer | 部分完成 |
| 中止链路 | agent-orchestration → safety-layer | 用户中止 |
| 异常链路 | 任意 Workflow → safety-layer | 执行出错 |

### P1: AI 推理步骤清单（action_items）

所有 6 个 Workflow 输出 `action_items[]`，结构化指引主 agent 逐条执行：

```javascript
{ step, action, title, skill, detail, reason, expects, depends_on, output_key }
```

6 种 action 类型：`conversation` | `skill` | `workflow` | `verify` | `review` | `manual`

### P2: WorkflowState 共享状态

每个 Workflow 输出 `state.produced` + `consumed_by`，层间数据传递透明可追踪：

| 生产层 | 关键数据 | 消费层 |
|--------|---------|--------|
| requirements-alignment | domain, keywords, acceptance_templates | agent-orchestration |
| agent-orchestration | batches, task_trackers, completion_summary | memory-layer, safety-layer |
| safety-layer | verdict, risk_count, safe_text | — |
| memory-layer | matches_count, source_count | — |

---

## 工作流程

### 启动新需求的完整流程

```
1. 需求对齐
   └─ Workflow({ name: 'requirements-alignment',
        args: { requirement: '需求描述' } })
        → 输出 chain.flow.next_conversations[4] 会话指引
        → 输出 action_items[5] 推理步骤
        → 输出 state.produced 数据声明

2. 链式对话（主 agent 按 chain 执行）
   Step 1: grill-me              → 调 brainstorming 锚定方向
   Step 2: grill-with-docs       → 约束梳理
   Step 3: 六源对齐审查           → Skills/Web/GitHub/记忆/真伪
   Step 4: 清单确认               → 逐条确认 4 张清单

3. 拆解执行（chain 数据转发到编排层）
   └─ Workflow({ name: 'agent-orchestration',
        args: { tasks, acceptance, domain } })
        → chain.executing.task_trackers 跟踪进度
        → action_items[2+N+1/批] 逐批执行
        → state.produced.task_results 记录判决

4. 完成链路（全部通过后自动）
   └─ chain.on_completion
        → memory-layer save（保存执行摘要）
        → safety-layer audit（记录完成审计）
```

### 日常操作

```javascript
// 技能分类地图
Workflow({ name: 'tool-layer', args: { action: 'map' } })
Workflow({ name: 'tool-layer', args: { action: 'map', category: '通信协议' } })
Workflow({ name: 'tool-layer', args: { action: 'map', task: 'I2C' } })

// 检查系统状态
Workflow({ name: 'ops-layer', args: { action: 'health' } })

// 查记忆
Workflow({ name: 'memory-layer', args: { action: 'search', query: '关键词' } })

// 管理技能
Workflow({ name: 'tool-layer', args: { action: 'list' } })

// 备份
Workflow({ name: 'ops-layer', args: { action: 'backup' } })
```

---

## 文件夹结构

```
chip-system/
│
├── CLAUDE.md              # 系统架构文档（Claude Code 自动读取）
├── SOUL.md                # Chip 人格定义（session-start hook 注入）
├── AGENTS.md              # AI 行为守则（安全规则体系）
├── USER.md                # 用户信息与偏好
├── config.json            # 默认配置模板
│
├── workflows/             # 六层 Workflow 脚本
│   ├── requirements-alignment.js  ← 需求对齐层（含 chain + action_items）
│   ├── safety-layer.js            ← 安全层
│   ├── agent-orchestration.js     ← 编排层（含 chain.on_completion）
│   ├── memory-layer.js            ← 记忆层
│   ├── tool-layer.js              ← 工具层（含 map 技能分类）
│   └── ops-layer.js               ← Ops 层
│
├── domains/               # 领域配置
│   ├── embedded.js        # 嵌入式领域预检规则
│   └── generic.js         # 通用领域预检规则
│
├── hooks/                 # Claude Code 会话钩子
│   └── session-start      # 自动注入 SOUL.md + AGENTS.md + 代理启动
│
├── bin/                   # 辅助脚本
│   └── deepseek-proxy.js  # DeepSeek API 代理
│
├── installer/             # NSIS Windows 安装包
│   ├── chip-installer.nsi
│   └── build-installer.bat
│
├── scripts/               # 安装脚本
│   ├── setup.sh           # Unix / macOS / Linux
│   └── setup.ps1          # Windows PowerShell
│
├── docs/                  # 文档
│   └── CHIP.md
│
├── README.md              # 仓库首页（本文）
├── LICENSE                # MIT 许可
└── .gitignore
```

---

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/shuai-yemao/shuai-yemao-chip-agent.git
cd chip-agent

# 2. 运行安装脚本
# Windows:
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
# macOS / Linux:
bash scripts/setup.sh

# 3. 检查系统状态
Workflow({ name: 'ops-layer', args: { action: 'health' } })

# 4. 启动新需求
Workflow({
  name: 'requirements-alignment',
  args: { requirement: '给 STM32F4 添加 I2C 驱动，挂 2 个传感器' }
})
```

---

## 使用方法

### 安全层

```
Workflow({ name: 'safety-layer', args: { action: 'preflight', task: { name: '操作', files: ['.env'] }, domain: 'embedded' } })
Workflow({ name: 'safety-layer', args: { action: 'audit', entry: { type: '已完成', ... } } })
Workflow({ name: 'safety-layer', args: { action: 'filter', text: '含敏感信息的文本' } })
```

### 记忆操作

```
Workflow({ name: 'memory-layer', args: { action: 'search', query: 'I2C' } })
Workflow({ name: 'memory-layer', args: { action: 'context', for: '当前任务' } })
Workflow({ name: 'memory-layer', args: { action: 'write', name: '新笔记', content: '...', symbols: ['timer_init'] } })
```

### 技能管理

```
Workflow({ name: 'tool-layer', args: { action: 'list' } })
Workflow({ name: 'tool-layer', args: { action: 'map', category: '通信协议' } })
Workflow({ name: 'tool-layer', args: { action: 'install', source: 'git-url' } })
Workflow({ name: 'tool-layer', args: { action: 'remove', name: 'skill-name' } })
Workflow({ name: 'tool-layer', args: { action: 'deps-tree' } })
```

### 系统运维

```
Workflow({ name: 'ops-layer', args: { action: 'health' } })
Workflow({ name: 'ops-layer', args: { action: 'backup' } })
Workflow({ name: 'ops-layer', args: { action: 'restore', from: 'path/to/backup.tar.gz', dryRun: true } })
Workflow({ name: 'ops-layer', args: { action: 'doctor' } })
Workflow({ name: 'ops-layer', args: { action: 'prune', days: 30 } })
```

---

## 许可

[MIT](LICENSE)
