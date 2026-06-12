---
slug: workflow-skill
trigger: "当需要执行复杂、多步骤或系统级任务时"
summary: "用户深度使用 Chip 五层系统 Workflow 和 90+ 嵌入式技能包，偏好技能驱动开发"
domain: workflow
scope: personal
confidence: 0.85
tags: [workflow, skill, orchestration, chip-system]
created: 2026-06-12
source: history.sessions(32 patterns)
---

**Why:** 用户在 32 个会话中引用 Workflow/Skill 系统，是 Chip 系统的核心用户模式。

**观察模式:**
- 偏好链式触发（alignment → orchestration → memory）
- 经常检查 Workflow 状态和技能映射
- 要求自动化执行而非手动分步操作

**How to apply:**
- 默认使用 Workflow 执行系统级操作
- 先调用 `tool-layer` 检查技能可用性
- 遵循五层架构的链式触发流程
