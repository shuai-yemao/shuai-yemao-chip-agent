---
slug: omc-config-ecc-integration
trigger: "当需要整合 ECC 系统功能到 Chip 五层系统时"
summary: "用户在 omc-config 项目中完成了 ECC → Chip 整合，包括 Homunculus + AgentShield + 规则体系"
domain: architecture
scope: project
confidence: 0.5
tags: [ecc, chip, integration, homunculus, agentshield]
created: 2026-06-12
source: history.session(omc-config)
project: gitee.com/TNSH/omc-config
---

**Why:** 用户在 omc-config 项目中完成了 ECC 系统向 Chip 五层系统的完整整合。

**观察模式:**
- 分 Phase 推进（Phase 1 → Phase 2 → P1/P2/P3 修复）
- 每个 Phase 完成后运行全量测试验证
- 遗留问题按优先级（P1/P2/P3/P4）分类处理
- 测试通过率要求 100%（217/217）

**How to apply:**
- 架构整合任务建议分 Phase 推进
- 每个 Phase 完成后运行 `__tests__/run-all-workflow-tests` 验证
- 遗留问题使用 P1-P4 优先级分类
- 文档和记忆文件同步更新
