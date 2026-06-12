---
slug: requirements-alignment
trigger: "当开始新功能开发或需求实现时"
summary: "用户坚持需求对齐层流程：grill-me → 约束梳理 → 六源审查 → 清单确认 → to-issues 拆解"
domain: workflow
scope: personal
confidence: 0.85
tags: [requirements, alignment, guide-mode, checklist, acceptance]
created: 2026-06-12
source: history.sessions(27 patterns)
---

**Why:** 用户在 27 个会话中引用需求对齐流程，严格要求先对齐再执行。

**观察模式:**
- 强调「5 步走完前不执行」
- 要求 4 张施工清单（现状/约束/文件/验收）全部用户确认
- 验收清单需要用户最终判决（verdict: pending → passed/failed）
- 偏好 Guide 模式（交互式）而非自动化执行

**How to apply:**
- 新需求第一步永远是 `requirements-alignment` Workflow
- 对话式交互，不要跳过用户确认
- 输出 chain 元数据指导后续步骤
