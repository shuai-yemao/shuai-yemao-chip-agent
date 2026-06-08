---
name: project-goal
description: 重构四份配置文件的背景与目标
metadata:
  type: project
---

# 项目目标

重构项目根目录四份 AI 配置文件（CLAUDE.md、SOUL.md、AGENTS.md、memory.md），使其各自完整、职责清晰。

## 背景

原有四份文件均为骨架状态：
- SOUL.md 几乎为空
- CLAUDE.md 过于简单
- AGENTS.md 只有权限矩阵
- memory.md 只有 3 行

全局 `~/.claude/CLAUDE.md` 中承载了本应属于项目级 SOUL.md 的内容。

## 目标

1. 每份文件聚焦单一职责
2. CLAUDE.md 保持简洁入口
3. SOUL.md 自包含 AI 人格定义
4. AGENTS.md 扩展为完整行为守则
5. memory.md 三合一：索引 + 决策 + 日志
