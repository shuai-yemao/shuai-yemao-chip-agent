# OMC 框架改进方案

## Context

基于四维评估（框架完善度 60% / 边界明确性 55% / 功能有效性 50% / 迭代能力 35%），在 CLAUDE.md 已新增 `<agent_core_workflow>` 自动 pre-flight 流程后，继续推进三个核心改进：
1. **度量闭环** — 采集→分析→反馈，让路由决策有数据支撑
2. **Prompt → 代码** — 将关键行为约束从文本指令迁移到 hook 代码
3. **命名空间统一** — 解决三套 Agent 命名冲突

## 执行策略

使用三个工具协同推进：
- **knowledge-base-search**：搜索多 agent 框架的度量闭环参考方案
- **ai-prompting-skill**：优化 agent prompt 模板质量
- **agent-team**：组建团队讨论并并行执行改进

---

## Phase 1: Prompt 优化 + 命名统一 (当前阶段)

### 1.1 使用 ai-prompting-skill 优化 Agent prompt 模板 [P0]

**目标**：将 CLAUDE.md 中重复、冗余、无约束力的 prompt 指令压缩为精确、可被模型优先关注的结构。

**具体做法**：
- 读取 CLAUDE.md 当前完整内容
- 调用 ai-prompting-skill 逐段优化：
  - `<checkpoint_system>` — 当前 ~40 行，压缩到 ~15 行关键规则
  - `<agent_direct_comm>` — 移除重复的通信示例，保留核心规则
  - `<observability>` — 合并到 `<checkpoint_system>` 中
  - `<fault_recovery>` — 与 `<agent_company_architecture>` 的重试逻辑去重
- 输出优化后的 CLAUDE.md，目标 token 节省 20-30%

### 1.2 统一 Agent 命名 [P1]

**问题**：三套命名（OMC Native 30 个 / Cherry 3 个 / C-Suite 7 个别名）共存，HUD 显示冲突。

**具体做法**：
- 在 `<agent_direct_comm>` 名册中，将 C-Suite 别名标注实际对应的 agent type：
  - `cro` → `oh-my-claudecode:explore`
  - `coo` → `oh-my-claudecode:executor`
  - `cto` → `oh-my-claudecode:architect`
  - `embedded` → `cherryclaw-embedded`
  - `dochandler` → `doc-handler`
  - `learner` → `cherryclaw-learner`
  - `reviewer` → `oh-my-claudecode:code-reviewer`
- 在 `<agent_company_architecture>` 能力矩阵中增加 `agent_type` 列
- 更新所有模板/示例中的 agent 引用

### 1.3 使用 knowledge-base-search 搜索参考方案 [P1]

**搜索主题**：
1. "multi-agent framework observability metrics dashboards" — LangGraph/CrewAI/AutoGen 的度量方案
2. "LLM prompt constraint enforcement patterns" — prompt 约束到代码约束的迁移模式
3. "agent orchestration fault recovery checkpointing" — Agent 故障恢复最佳实践

**输出**：为 Phase 2 的代码改进提供可参考的设计模式。

---

## Phase 2: 代码约束 + 度量闭环 (后续)

### 2.1 HUD Agent 编码扩展

**文件**：`src/hud/elements/agents.ts`
- 在 `AGENT_TYPE_CODES` 中增加 Cherry agent 条目
- 修复 `getAgentCode()` 对 `cherry/` 前缀的处理

### 2.2 运行时验证 (2 条关键约束)

1. **环境探针** — PreToolUse hook 检查依赖可用性
2. **禁止自审批** — 路由时检查同一 agent 不能同时做实现+审查

### 2.3 度量闭环

- SessionEnd → recordSessionMetrics (已有)
- SessionStart → 注入上轮度量反馈（需新增）
- SessionReplay → 瓶颈分析 → 路由调整建议（需新增）

---

## Phase 3: 测试 + 实验系统 (远期)

- 集成测试套件
- Canary 实验标志
- 定期度量报告

---

## 验证方式

1. **Phase 1 验证**：diff CLAUDE.md 前后 token 数；确认 HUD 中 agent 名称唯一可辨识
2. **Phase 2 验证**：手写测试用例验证环境探针拦截；agent 路由日志验证自审批被阻止
3. **Phase 3 验证**：运行集成测试套件；检查 `.omc/metrics/` 下报告文件生成
