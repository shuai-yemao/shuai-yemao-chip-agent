---
name: arch-decision
description: 文件结构、引用关系、职责划分
metadata:
  type: reference
---

# 架构决策

## 方案

**方案 A：单入口 + 单一职责**

```
CLAUDE.md  ← 入口：项目名片（简洁）
  ├→ SOUL.md    ← AI 人格（自包含）
  ├→ AGENTS.md  ← 行为守则（完整版）
  └→ memory.md  ← 知识库（索引 + 决策 + 日志）
```

## 文件职责

| 文件 | 职责 | 内容来源 |
|------|------|----------|
| CLAUDE.md | 项目上下文入口 | 现有精简 |
| SOUL.md | AI 人格定义 | 从 `~/.claude/CLAUDE.md` 迁移 |
| AGENTS.md | AI 行为守则 | 从权限矩阵扩展 |
| memory.md | 项目知识库 | 从骨架重写 |

## 引用规则

- CLAUDE.md 通过 `[[链接]]` 指向其他三个文件
- 各文件自包含，不循环引用
- 持久记忆存于 `.claude/memory/`
