# 项目知识库

> 三合一：记忆索引 | 决策记录 | 重构日志

## 记忆索引

- [项目目标](.claude/memory/project-goal.md) — 重构四份配置文件的背景与目标
- [架构决策](.claude/memory/arch-decision.md) — 文件结构、引用关系、职责划分

## 决策记录

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-06-08 | 采用方案 A：单入口 + 单一职责 | CLAUDE.md 保持简洁，各文件独立聚焦 |
| 2026-06-08 | SOUL.md 人格名为 Chip，中文为主 | 明确身份与交流语言 |
| 2026-06-08 | AGENTS.md 扩展为完整行为守则 | 不限于权限矩阵，加入通信协议和约束 |
| 2026-06-08 | memory.md 三合一 | 索引 + 决策记录 + 重构日志 |

## 重构日志

```
2026-06-08 重构启动
  - [x] 需求对齐：四份文件职责确认
  - [x] 设计文档：docs/superpowers/specs/
  - [x] 实施计划：docs/superpowers/plans/
  - [x] SOUL.md → 重写（Chip + 专业领域/语言风格）
  - [x] AGENTS.md → 扩展为完整行为守则
  - [x] CLAUDE.md → 精简为入口名片
  - [x] memory.md → 三合一
  - [ ] 全局 ~/.claude/CLAUDE.md 清理
```

## 参考链接

- [全局 CLAUDE.md](file:///.claude/CLAUDE.md) — 迁移来源
- [技能目录](skills/) — 本地 skill 文件
- [设计文档](docs/superpowers/specs/2026-06-08-config-files-refactor-design.md)
- [实施计划](docs/superpowers/plans/2026-06-08-config-files-refactor.md)
