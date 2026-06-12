# P4：长期架构项 — 三个方向

## Context

ECC → Chip 整合后，系统架构高度完整（五层 Workflow + 链式触发 + 安全层 + AgentShield + Homunculus + 测试 217/217）。但有三个空白区域需要补齐：

1. `~/.claude/agents/` 目录不存在，未使用 Claude Code 原生 agent 定义
2. `domains/` 只有 embedded + generic 两个领域配置
3. `homunculus/instincts/projects/` 为空，项目级本能未积累

## P4-1：创建原生 Agent 定义

### 目标
在 `~/.claude/agents/` 下创建专用 agent 定义文件，与五层系统联动。

### Agent 清单

| Agent | 文件 | 用途 |
|-------|------|------|
| embedded-expert | `embedded-export.md` | 嵌入式开发专家，调用五层系统 |
| code-reviewer | `code-reviewer.md` | 代码审查，安全层预检 |
| test-runner | `test-runner.md` | 测试执行，调用 `__tests__/run-all-workflow-tests` |
| devops | `devops.md` | 运维操作，调用 ops-layer |

### 格式
Claude Code 原生 agent 使用 Markdown + YAML frontmatter：
```markdown
---
name: embedded-expert
description: 嵌入式系统开发专家
model: mimo-v2.5
tools: [Read, Edit, Write, Bash, Grep, Glob, Agent, Skill]
---
# 角色定义...
```

### 验证
- `claude --agent embedded-expert` 能启动
- Agent 能调用对应 Workflow

## P4-2：领域扩展

### 目标
新增 2 个领域配置，扩展 `domains/` 目录。

### 新增领域

| 领域 | 文件 | 用途 |
|------|------|------|
| web | `domains/web.js` | Web 开发（React/Vue/Node.js） |
| data | `domains/data.js` | 数据处理（Python/SQL/ETL） |

### 格式
参考 `embedded.js` 和 `generic.js` 的结构：
- `config.name` — 领域名
- `config.skillCategory` — skill 到类别的映射
- `config.categoryPrompts` — 类别执行指引
- `config.troubleshootingMap` — 排查路线图
- `config.verificationCriteria` — 知识验证标准
- `security` — 安全配置

### 验证
- `tool-layer list` 能显示新领域的 skill 映射
- 需求对齐层能检测到新领域

## P4-3：Homunculus 项目级积累

### 目标
在当前项目中触发 capture → analyze → instincts，填充 `projects/` 目录。

### 步骤
1. 运行 `homunculus-observer capture` 捕获当前会话观察
2. 运行 `homunculus-observer analyze` 分析并生成本能
3. 检查 `instincts/projects/` 是否有新条目
4. 如有高置信度本能，运行 `homunculus-observer evolve` 进化

### 验证
- `instincts/projects/` 下有项目级本能文件
- 本能文件包含 git remote 作为项目标识

## 文件清单

### 新建
- `~/.claude/agents/embedded-expert.md`
- `~/.claude/agents/code-reviewer.md`
- `~/.claude/agents/test-runner.md`
- `~/.claude/agents/devops.md`
- `~/.claude/workflows/domains/web.js`
- `~/.claude/workflows/domains/data.js`

### 修改
- `~/.claude/CLAUDE.md` — 添加 agent 使用说明
- `~/.claude/workflows/ops-layer.js` — version action 列出 agents/ 目录

## 执行顺序

1. P4-1：创建 agents/ 目录 + 4 个 agent 定义
2. P4-2：创建 2 个新领域配置
3. P4-3：触发 Homunculus 项目级积累
4. 验证 + 更新文档
