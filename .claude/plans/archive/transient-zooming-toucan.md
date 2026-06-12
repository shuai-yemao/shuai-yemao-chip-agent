# ECC 整合计划 — Phase 1：Homunculus + AgentShield

## Context

Chip 五层系统已覆盖需求对齐、安全护栏、编排调度、记忆持久化和技能/运维管理，但缺乏**自动从编码行为中学习模式**的能力和**静态安全配置扫描**。ECC (Everything Claude Code) 提供了这两个方向的成熟参考实现。本计划分阶段将 ECC 最有价值的组件整合进 Chip，保持架构一致性和低侵入性。

## Phase 1 范围

**P0 优先级：两个独立组件，可并行实施**

### 1. Homunculus 持续学习系统

自动从会话历史中提取用户编码模式，存储为原子化"本能"（instincts），置信度 >0.7 时桥接到记忆层。

**新建文件：**
- `~/.claude/workflows/homunculus-observer.js` — 核心 Workflow：capture/analyze/status
- `~/.claude/bin/homunculus-hook.js` — PostCompact hook，增量读取 history.jsonl
- `~/.claude/homunculus/homunculus-config.yml` — 配置（冷却时间/置信度参数/重入保护）
- `~/.claude/homunculus/instincts/INDEX.md` — 本能索引
- `~/.claude/homunculus/observations/` — 观察日志目录
- `~/.claude/workflows/__tests__/homunculus-observer.test.js` — 测试（5 tests）

**修改文件：**
- `~/.claude/settings.json` — 注册 hooks.PostCompact
- `~/.claude/workflows/agent-orchestration.js` — on_completion 链可选触发分析

### 2. AgentShield 安全扫描器（Chip 版）

静态扫描 Claude Code 配置中的密钥泄露、权限误配等安全问题，作为 safety-layer 新 action。

**新建文件：**
- `~/.claude/workflows/agentshield-rules.js` — 35 条扫描规则（Phase 1 范围）
- `~/.claude/workflows/__tests__/agentshield-scan.test.js` — 测试（6 tests）

**修改文件：**
- `~/.claude/workflows/safety-layer.js` — 新增 handleScan() + ACTION_HANDLERS 注册

### 无需修改

SOUL.md / AGENTS.md / memory-layer.js / requirements-alignment.js / tool-layer.js / ops-layer.js / hooks/session-start / bin/deepseek-proxy.js

## 实施步骤

### 批次 1 — 基础设施（可并行）

| # | 任务 | 文件 | 预估 |
|---|------|------|------|
| A1 | 创建 Homunculus 目录结构 + 配置 | `homunculus/` 子目录 + config.yml | 20min |
| A2 | 创建 AgentShield 规则库 | `agentshield-rules.js`（35 条规则） | 40min |

### 批次 2 — 核心实现（依赖批次 1）

| # | 任务 | 文件 | 预估 |
|---|------|------|------|
| B1 | Homunculus hook 脚本 | `bin/homunculus-hook.js` | 30min |
| B2 | 注册 PostCompact hook | `settings.json` | 10min |
| C1 | Homunculus 分析引擎 Workflow | `homunculus-observer.js`（analyze/capture/status） | 90min |
| D1 | Safety-layer scan action | `safety-layer.js` 修改 | 45min |
| D2 | Auto-fix 支持 | `safety-layer.js` handleScan 扩展 | 20min |

### 批次 3 — 测试（依赖批次 2）

| # | 任务 | 文件 | 预估 |
|---|------|------|------|
| E1 | Homunculus 单元测试 | `__tests__/homunculus-observer.test.js` | 30min |
| E2 | AgentShield 单元测试 | `__tests__/agentshield-scan.test.js` | 30min |
| E3 | 集成测试 | 手动验证链路 | 20min |
| F1 | 文档更新 | `CLAUDE.md` | 20min |

## 关键设计决策

| 决策 | 方案 | 原因 |
|------|------|------|
| Homunculus 存储 | `~/.claude/homunculus/` 独立目录 | 数据模型与记忆层不同（置信度演进 vs 静态知识） |
| 观察源 | `history.jsonl` 增量读取 | Claude Code harness 不支持 PreToolUse/PostToolUse hook |
| 观察触发 | PostCompact hook + 手动 | 不阻塞会话流程，异步执行 |
| 分析模型 | 子 agent (deepseek-v4-flash) | 复用现有基础设施，0 新增依赖 |
| 桥接记忆层 | confidence >= 0.7 时自动触发 memory-layer write | 渐进式融入现有体系 |
| AgentShield 位置 | safety-layer 新 action `scan` | 复用安全层审计/非阻塞/输出模式 |
| 规则来源 | 自主实现（参考 ECC 分类体系） | 避免版权问题 + 定制适配 Chip |
| Phase 1 规则量 | 35 条（总 102 条的 35%） | 聚焦核心能力验证，其余 Phase 2 |

## 验证方案

1. `Workflow({ name: 'homunculus-observer', args: { action: 'status' } })` — 查看系统状态
2. 在 Claude Code 中执行多次工具调用后运行 `action: 'analyze'` — 检查 instincts 是否生成
3. `Workflow({ name: 'safety-layer', args: { action: 'scan', scope: 'all' } })` — 全量扫描评分
4. 在 `settings.json` 中注入已知问题，运行 `action: 'scan'` — 验证检测率
5. 运行全部现有测试：`workflows/__tests__/` 下所有 test — 确保不破坏现有功能

## Phase 2 预留路线

- Homunculus instincts → evolved skills/commands/agents（聚类进化）
- Homunculus 项目级作用域（基于 git remote）
- AgentShield 规则扩展到 102 条
- 集成到 ops-layer doctor action
- rules/ 目录分层规则补充 AGENTS.md
