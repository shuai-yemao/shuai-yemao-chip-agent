# Context Map — Chip Agent System

## 5 层 Workflow 体系

```
User Request
    │
    ▼
requirements-alignment.js
    │  chain.flow.next_conversations → 4 步对话指引
    │  chain.flow.next_workflow → agent-orchestration
    │  action_items[5] → 结构化推理步骤
    │  state.produced → domain, keywords, acceptance_templates
    ▼
safety-layer.js  (Phase 0.5: 预检 / Phase 2.5: 审计)
    │  action_items → 审查风险、处理被阻止的操作
    │  state.produced → verdict, risk_count
    ▼
agent-orchestration.js
    │  DAG 分批 → skill 推荐 → 手动 TDD 指引 → 验收跟踪
    │  chain.on_completion → memory-layer + safety-layer
    │  action_items[2+N+1 per batch] → 每批任务
    │  state.produced → batches, task_trackers
    ▼
memory-layer.js  (保存执行摘要 / 审计日志)
```

## 8 层参考架构

- [interaction-layer](./layers/interaction/CONTEXT.md) — 交互层：对话体验优化
- [alignment-layer](./layers/alignment/CONTEXT.md) — 需求对齐层：从原始需求到可执行方案
- [orchestration-layer](./layers/orchestration/CONTEXT.md) — Agent 编排层：任务拆解/sub-agent 分配/技能路由
- [communication-layer](./layers/communication/CONTEXT.md) — 通信层：消息队列/网络 I/O/文件 I/O/MCP
- [knowledge-layer](./layers/knowledge/CONTEXT.md) — 知识管理层：记忆/人格/知识库
- [tool-layer](./layers/tool/CONTEXT.md) — 工具层：Skills/MCP/SDK 管理
- [security-layer](./layers/security/CONTEXT.md) — 安全管理：权限/沙箱/版本
- [ops-layer](./layers/ops/CONTEXT.md) — 系统运维：打包/升级/维护

## Relationships

| 源 | 目标 | 传递方式 |
|----|------|---------|
| requirements-alignment → agent-orchestration | `chain.flow.next_workflow` + `state.produced` | Workflow args forwarding |
| agent-orchestration → memory-layer | `chain.on_completion` | save execution summary |
| agent-orchestration → safety-layer | `chain.on_completion` / `chain.on_cancel` | audit log |
| safety-layer → agent-orchestration | `workflow('safety-layer')` inline call | Phase 0.5/2.5 |
| requirements-alignment → memory-layer | `workflow('memory-layer')` inline call | Phase 0.5 context retrieval |
| all layers → tool-layer | `action_items[].skill` | skill invocation |
| tool-layer → skills | `SKILL_CATEGORIES` + `TASK_SKILL_RECOMMENDATIONS` | inline classification data |

## Layout

- 5 层 Workflow 脚本在 `.claude/workflows/*.js`
- 8 层参考实现在 `layers/` 目录
- 层间数据传递通过 `state.produced` + `chain.flow.next_workflow.args_forwarding`
- 步骤指引通过 `action_items[]`
