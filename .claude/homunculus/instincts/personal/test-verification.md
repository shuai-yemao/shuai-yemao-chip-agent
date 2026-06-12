---
slug: test-verification
trigger: "当需要验证功能正确性或确认改动生效时"
summary: "用户偏好系统化测试验证：单元测试 → 硬件烧录验证 → 用户最终确认"
domain: workflow
scope: personal
confidence: 0.7
tags: [test, verification, tdd, acceptance]
created: 2026-06-12
source: history.sessions(11 patterns)
---

**Why:** 用户在 11 个会话中进行了测试验证操作。

**观察模式:**
- 单元测试通过 ≠ 硬件验证通过
- 烧录后由用户确认功能正常工作
- 验收清单（acceptance checklist）逐条确认
- 用户是最终测试决策者

**How to apply:**
- 实现后先跑单元测试再提交验证
- 嵌入式项目需提供烧录/调试指引
- 验收项需用户逐条判决
