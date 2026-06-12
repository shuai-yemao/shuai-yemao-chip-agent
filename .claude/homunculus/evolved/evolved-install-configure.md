---
slug: evolved-install-configure
source_instinct: install-configure
confidence: 0.85
evolved_at: 2026-06-12
domain: tooling
---

# 安装配置自动化（进化技能）

## 触发条件
当需要安装新工具、配置环境或集成外部服务时

## 能力摘要
用户倾向通过 Claude Code Workflow 安装配置工具，偏好使用技能包管理器进行自动化安装

## 应用规则
1. 遇到安装请求时，优先使用 `tool-layer install` Workflow
2. 主动提供技能包管理方案而非手动配置
3. 支持从 Git URL 安装和批量依赖分析

## 关联技能
- tool-layer (install / remove / update / deps-tree)
- memory-layer (保存安装记录)

## 进化历史
- 源本能: install-configure (confidence: 0.85)
- 进化时间: 2026-06-12
