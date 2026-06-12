---
slug: omc-config-model-switching
trigger: "当需要切换 AI 模型或配置 API 代理时"
summary: "用户在 omc-config 项目中频繁切换 mimo/DeepSeek/CherryIn 模型，偏好混搭策略降低成本"
domain: tooling
scope: project
confidence: 0.5
tags: [model, switching, api, proxy, cost-optimization]
created: 2026-06-12
source: history.session(omc-config)
project: gitee.com/TNSH/omc-config
---

**Why:** 用户在 omc-config 项目中进行了多次模型配置切换，形成了稳定的模型选择模式。

**观察模式:**
- 默认使用 mimo-v2.5（国内直连，无需代理）
- 需要真正 Claude 模型时切换到 CherryIn（claude-sonnet-4.6）
- 子 agent 使用最便宜的模型（DeepSeek Flash）
- 中等任务使用国产模型（GLM/mimo）
- 绕过代理直连 API 以提高速度

**How to apply:**
- 检测到模型配置需求时，优先推荐 mimo 模式
- 需要 Claude 能力时推荐 CherryIn 混搭方案
- 子 agent 建议使用 DeepSeek Flash 降低成本
- 配置时注意绕过 ALL_PROXY 以提高速度
