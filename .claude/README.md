# Chip — 五层 Agent 系统

> 嵌入式系统级架构师，运行在 Claude Code 之上的智能开发助手。

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户交互层                                │
│  需求对齐 → grill-me → 六源审查 → 清单确认 → 拆解执行       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  安全层 (safety-layer)                                      │
│  预检 / 权限 / 高危确认 / 隐私过滤 / 审计 / 异常检测        │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  编排层 (agent-orchestration)                               │
│  DAG 调度 / 并行分发 / 三层门禁 / 重试                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  记忆层 (memory-layer)                                      │
│  关键词检索 / 向量语义检索 / 读写 / 上下文注入              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  工具层 (tool-layer)                                        │
│  技能包管理 / 依赖分析 / 安装 / 卸载 / 更新                │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 快速开始

### 安装

```bash
# 克隆仓库
git clone https://gitee.com/TNSH/omc-config.git ~/.claude

# 安装 Python 依赖（可选，用于 AI-Embed-Hub）
pip install PyPDF2 docx2txt
```

### 配置

1. 确保 Claude Code 已安装并配置
2. 安装 Tesseract OCR（可选，用于图片文字识别）

### 启动

```bash
# 启动 Claude
claude

# 使用专用 Agent
claude --agent embedded-expert
claude --agent code-reviewer
```

## 📖 使用指南

### 1. 启动新需求

```javascript
// 启动需求对齐（后台异步运行）
Workflow({
  name: 'requirements-alignment',
  args: { requirement: '你的需求描述' }
})

// 主 Agent 立即开始交互式对话
// 调用 grill-me 技能无情追问
```

### 2. 记忆操作

```javascript
// 关键词搜索
Workflow({ name: 'memory-layer', args: { action: 'search', query: 'I2C' } })

// 向量语义检索（推荐）
Workflow({ name: 'memory-layer', args: { action: 'vector_search', query: '嵌入式通信协议', topK: 5 } })

// 读取记忆
Workflow({ name: 'memory-layer', args: { action: 'read', name: 'project-goal' } })

// 写入记忆
Workflow({ name: 'memory-layer', args: { action: 'write', name: 'new-note', description: '摘要', type: 'reference', content: '正文内容' } })
```

### 3. 工具层 / 安全层 / Ops 层

详见 `reference/WORKFLOWS.md`

### 4. 嵌入式专属约束

详见 `reference/EMBEDDED.md`

### 5. 安全扫描 + 测试规范

详见 `reference/SECURITY.md`

## 📁 目录结构

```
~/.claude/
├── CLAUDE.md                    # 系统指引（1.5KB）
├── SOUL.md                      # Chip 人格（3.4KB）
├── AGENTS.md                    # 行为守则（6.1KB）
├── README.md                    # 本文件
│
├── reference/                   # 按需加载的参考文档
│   ├── WORKFLOWS.md             # Workflow API 参考
│   ├── EMBEDDED.md              # 嵌入式专属约束
│   └── SECURITY.md              # 安全扫描 + 测试规范
│
├── agents/                      # 专用 Agent 定义
│   ├── embedded-expert.md
│   ├── code-reviewer.md
│   ├── test-runner.md
│   └── devops.md
│
├── workflows/                   # 核心 Workflow
│   ├── requirements-alignment.js
│   ├── safety-layer.js
│   ├── agent-orchestration.js
│   ├── memory-layer.js
│   ├── tool-layer.js
│   ├── ops-layer.js
│   ├── homunculus-observer.js
│   ├── agentshield-scanner.js
│   ├── domains/
│   └── __tests__/
│
├── skills/                      # 技能包（77+）
│   ├── ai-embed-hub/
│   ├── i2c-bus/
│   ├── spi-bus/
│   └── ...
│
├── rules/                       # 分层规则
│   ├── security/
│   ├── workflow/
│   ├── embedded/
│   └── privacy/
│
├── homunculus/                  # 持续学习
├── memory/                      # 记忆文件
├── bin/                         # 辅助脚本
└── hooks/                       # Hook 脚本
```

### 上下文优化

三大核心文件（CLAUDE.md + SOUL.md + AGENTS.md）合计 **11KB**，相比优化前 **56KB** 减少 80%。详细参考文档按需加载，不占用日常上下文。

| 文件 | 优化前 | 优化后 | 说明 |
|------|:------:|:------:|------|
| CLAUDE.md | 23KB | 1.5KB | 系统指引 + 约束 |
| SOUL.md | 18KB | 3.4KB | 人格 + 专业领域 + Alignment Flow |
| AGENTS.md | 15KB | 6.1KB | 权限 + 文件边界 + 隐私 + 审计 |
| **合计** | **56KB** | **11KB** | **-80%** |

## 🧪 测试

```bash
# 运行全部 Workflow 测试（217 项）
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js

# 单个测试
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js --file safety-layer.test.js
```

| 模块 | 测试数 | 状态 |
|------|:------:|:----:|
| safety-layer | 48 | ✅ |
| tool-layer | 23 | ✅ |
| embedded-security | 22 | ✅ |
| integration | 22 | ✅ |
| orchestration-security | 19 | ✅ |
| agentshield-scanner | 20 | ✅ |
| homunculus-observer | 15 | ✅ |
| AI-Embed-Hub（Python） | 69 | ✅ |
| **总计** | **286** | ✅ |

## 领域配置

| 领域 | 用途 | 技能映射 |
|------|------|---------|
| `embedded` | 嵌入式开发（STM32/ESP32/RISC-V） | 60+ 技能 |
| `generic` | Web 开发（React/Vue/Node.js） | 30+ 技能 |
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

## 📝 更新日志

### v2.2.0 (2026-06-15)

- ✅ 上下文优化：三大核心文件从 56KB 精简到 11KB（-80%）
- ✅ 拆分参考文档到 `reference/` 目录（按需加载）
- ✅ 移除重复内容（架构图、Workflow 示例、测试规范）
- ✅ 职责分离：CLAUDE.md 指引、SOUL.md 人格、AGENTS.md 规则

### v2.1.0 (2026-06-13)

- ✅ AI-Embed-Hub: GitHub 项目搜索 skill
- ✅ Fleet 并行引擎: 多 Agent 并行执行
- ✅ 向量存储: 语义检索能力（JS + Python）
- ✅ 文档解析器: TXT/PDF/DOCX/OCR
- ✅ 69 个新测试全部通过

### v2.0.0 (2026-06-12)

- ✅ ECC Phase 2: 102 条规则
- ✅ Homunculus 持续学习系统
- ✅ AgentShield 安全扫描器
- ✅ 分层规则目录

### v1.0.0 (2026-06-08)

- ✅ 五层 Agent 系统初始版本

## 🔗 仓库

- **GitHub**: https://github.com/shuai-yemao/shuai-yemao-chip-agent
- **Gitee**: https://gitee.com/TNSH/omc-config

## 📄 许可证

私有项目，仅供个人使用。
