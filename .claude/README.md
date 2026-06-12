# Chip — 五层 Agent 系统

> 嵌入式系统级架构师，运行在 Claude Code 之上的智能开发助手。

## 系统架构

```
用户模糊需求
     │
     ▼
┌──────────────────────────────────────────────────────────┐
│  需求对齐层（Guide 模式）                                 │
│  grill-me → grill-with-docs → 六源审查 → to-issues       │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│  安全层（102 条规则 + AgentShield）                       │
│  预检/权限/高危确认/隐私过滤/审计/异常检测                 │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│  编排层（DAG 调度 + 三层门禁）                            │
└────────────────────────┬──────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│  记忆层（检索/读写/上下文注入 + Codegraph）                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────┐  ┌──────────────────────────────┐
│  Ops 层（运维/备份/部署）     │  │  工具层（技能包管理）          │
└──────────────────────────────┘  └──────────────────────────────┘
```

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://gitee.com/TNSH/omc-config.git ~/.claude

# 安装依赖（可选）
cd ~/.claude && npm install
```

### 配置

1. 复制 `.env.secrets.example` 为 `.env.secrets`，填入 API Key
2. 确保 `.bashrc` 中 source 了 `.env.secrets`
3. 重启终端或运行 `source ~/.bashrc`

### 使用

```bash
# 启动 Claude（默认 mimo 模式）
claude

# 启动 CherryIn 模式（Claude 4.6 + 混搭）
claude-cherryin

# 启动 DeepSeek 模式
claude-deepseek

# 使用专用 Agent
claude --agent embedded-expert
claude --agent code-reviewer
claude --agent test-runner
claude --agent devops
```

## 目录结构

```
~/.claude/
├── CLAUDE.md              # 系统架构文档
├── SOUL.md                # Chip 人格定义
├── AGENTS.md              # 行为守则
├── USER.md                # 用户画像
├── README.md              # 本文件
│
├── agents/                # 专用 Agent 定义
│   ├── embedded-expert.md
│   ├── code-reviewer.md
│   ├── test-runner.md
│   └── devops.md
│
├── workflows/             # 核心 Workflow
│   ├── requirements-alignment.js  # 需求对齐层
│   ├── safety-layer.js            # 安全层
│   ├── agent-orchestration.js     # 编排层
│   ├── memory-layer.js            # 记忆层
│   ├── tool-layer.js              # 工具层
│   ├── ops-layer.js               # Ops 层
│   ├── homunculus-observer.js     # Homunculus 持续学习
│   ├── agentshield-scanner.js     # AgentShield 安全扫描
│   ├── agentshield-rules.js       # AgentShield 规则库
│   ├── domains/                   # 领域配置
│   │   ├── embedded.js
│   │   ├── web.js
│   │   └── data.js
│   └── __tests__/                 # 测试套件
│       ├── run-all-workflow-tests.js
│       └── *.test.js
│
├── skills/                # 技能包（77+）
├── rules/                 # 分层规则
│   ├── security/
│   ├── workflow/
│   ├── embedded/
│   └── privacy/
│
├── homunculus/            # Homunculus 持续学习
│   ├── instincts/         # 本能（6 个人物 + 2 个项目）
│   ├── evolved/           # 进化技能（4 个）
│   └── observations/      # 观察数据
│
├── memory/                # 持久记忆
│   └── FACT.md
│
├── bin/                   # 辅助脚本
├── hooks/                 # Hook 脚本
└── .env.secrets           # API Key（不提交）
```

## 测试

```bash
# 运行全部测试（217 项）
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js

# 运行单个测试
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js --file safety-layer.test.js
```

## 领域配置

| 领域 | 用途 | 技能映射 |
|------|------|---------|
| `embedded` | 嵌入式开发（STM32/ESP32/RISC-V） | 60+ 技能 |
| `web` | Web 开发（React/Vue/Node.js） | 30+ 技能 |
| `data` | 数据处理（Python/SQL/ETL/ML） | 30+ 技能 |

## 模型切换

| 命令 | 模式 | Base URL | 模型 |
|------|------|----------|------|
| `claude` | mimo（默认） | api.xiaomimimo.com | mimo-v2.5 |
| `claude-cherryin` | CherryIn | open.cherryin.cc | Claude 4.6 + 混搭 |
| `claude-deepseek` | DeepSeek | api.deepseek.com | deepseek-v4-pro |

## 安全

- 102 条 AgentShield 规则覆盖 8 分类
- 安全层预检/审计/异常检测
- Homunculus 持续学习 + 本能演进
- 敏感信息脱敏（API Key/密码/邮箱/IP）

## 许可证

私有项目，仅供个人使用。
