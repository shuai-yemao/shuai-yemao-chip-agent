---
slug: install-configure
trigger: "当需要安装新工具、配置环境或集成外部服务时"
summary: "用户倾向通过 Claude Code Workflow 安装配置工具，偏好使用技能包管理器进行自动化安装"
domain: tooling
scope: personal
confidence: 0.85
tags: [install, configure, tooling, mcp, plugin]
created: 2026-06-12
source: history.sessions(37 patterns)
---

**Why:** 用户在 37 个会话中提及安装/配置操作（安装 MCP、技能包、插件等），是最高频的操作类型。

**观察模式:**
- 偏好使用 Workflow 自动化安装而非手动操作
- 经常从外部 URL 引用安装源（GitHub、claude-zh.cn 等）
- 常同时安装多个关联组件（MCP + 插件 + 技能包）

**How to apply:**
- 遇到安装请求时，优先使用 `tool-layer install` Workflow
- 主动提供技能包管理方案而非手动配置
