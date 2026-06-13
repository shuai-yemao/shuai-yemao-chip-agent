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
Workflow({
  name: 'memory-layer',
  args: { action: 'search', query: 'I2C' }
})

// 向量语义检索（推荐）
Workflow({
  name: 'memory-layer',
  args: { action: 'vector_search', query: '嵌入式通信协议', topK: 5 }
})

// 读取记忆
Workflow({
  name: 'memory-layer',
  args: { action: 'read', name: 'project-goal' }
})

// 写入记忆
Workflow({
  name: 'memory-layer',
  args: {
    action: 'write',
    name: 'new-note',
    description: '摘要',
    type: 'reference',
    content: '正文内容'
  }
})

// 添加到向量存储
Workflow({
  name: 'memory-layer',
  args: {
    action: 'add_to_vector',
    name: 'i2c-guide',
    content: 'I2C 通信协议详解',
    type: 'reference'
  }
})

// 列出向量存储
Workflow({
  name: 'memory-layer',
  args: { action: 'list_vector' }
})
```

### 3. AI-Embed-Hub（项目搜索）

```bash
# 搜索 AI 嵌入式项目（Fleet 并行）
python ~/.claude/skills/ai-embed-hub/search_fleet.py

# 自定义搜索
python ~/.claude/skills/ai-embed-hub/search_fleet.py --query "TinyML" --days 30

# 搜索 agent 架构设计
python ~/.claude/skills/ai-embed-hub/search_fleet.py --query "agent framework"
```

### 4. 文档解析

```python
from doc_parser import DocParser, DocVectorBridge
from vector_store import VectorStore

# 解析文档
parser = DocParser()
result = parser.parse('datasheet.pdf')
print(result['content'])

# 向量化存储
vector_store = VectorStore(dimension=256)
bridge = DocVectorBridge()
bridge.process_file('datasheet.pdf', vector_store)

# 语义检索
results = vector_store.search('I2C 时序', top_k=5)
for r in results:
    print(f"{r['id']}: {r['score']:.4f}")
```

### 5. OCR 图片识别

```python
from doc_parser import OCRWrapper

wrapper = OCRWrapper()
if wrapper.is_available():
    result = wrapper.ocr_image('screenshot.png')
    print(result['text'])
```

### 6. 工具层操作

```javascript
// 列出所有技能
Workflow({ name: 'tool-layer', args: { action: 'list' } })

// 技能分类地图
Workflow({ name: 'tool-layer', args: { action: 'map' } })

// 安装技能
Workflow({ name: 'tool-layer', args: { action: 'install', source: 'git-url' } })
```

### 7. 安全层操作

```javascript
// 预检任务安全性
Workflow({
  name: 'safety-layer',
  args: {
    action: 'preflight',
    task: { name: '操作', files: ['.env'], command: '' },
    domain: 'embedded'
  }
})
```

### 8. Ops 层操作

```javascript
// 系统健康检查
Workflow({ name: 'ops-layer', args: { action: 'health' } })

// 全量备份
Workflow({ name: 'ops-layer', args: { action: 'backup' } })
```

## 📁 目录结构

```
~/.claude/
├── CLAUDE.md                    # 系统架构文档
├── SOUL.md                      # Chip 人格定义
├── AGENTS.md                    # 行为守则
├── README.md                    # 本文件
│
├── agents/                      # 专用 Agent 定义
│   ├── embedded-expert.md
│   ├── code-reviewer.md
│   ├── test-runner.md
│   └── devops.md
│
├── workflows/                   # 核心 Workflow
│   ├── requirements-alignment.js  # 需求对齐层
│   ├── safety-layer.js            # 安全层
│   ├── agent-orchestration.js     # 编排层
│   ├── memory-layer.js            # 记忆层（含向量检索）
│   ├── tool-layer.js              # 工具层
│   ├── ops-layer.js               # Ops 层
│   ├── vector-store.js            # 向量存储模块
│   ├── homunculus-observer.js     # Homunculus 持续学习
│   ├── agentshield-scanner.js     # AgentShield 安全扫描
│   ├── agentshield-rules.js       # AgentShield 规则库
│   ├── domains/                   # 领域配置
│   └── __tests__/                 # 测试套件
│       ├── vector-store.test.js   # 向量存储测试
│       └── *.test.js
│
├── skills/                      # 技能包（77+）
│   ├── ai-embed-hub/            # AI 嵌入式项目搜索
│   │   ├── search.py            # 串行搜索
│   │   ├── search_fleet.py      # Fleet 并行搜索
│   │   ├── fleet_engine.py      # Fleet 引擎
│   │   ├── vector_store.py      # 向量存储（Python）
│   │   ├── doc_parser/          # 文档解析器
│   │   │   ├── doc_parser.py    # TXT/PDF/DOCX 解析
│   │   │   ├── smart_chunker.py # 智能分块
│   │   │   ├── ocr_wrapper.py   # OCR 包装器
│   │   │   └── doc_vector_bridge.py # 文档向量桥接
│   │   └── tests/               # 测试
│   ├── i2c-bus/                 # I2C 技能
│   ├── spi-bus/                 # SPI 技能
│   └── ...                      # 其他技能
│
├── rules/                       # 分层规则
│   ├── security/
│   ├── workflow/
│   ├── embedded/
│   └── privacy/
│
├── homunculus/                  # Homunculus 持续学习
│   ├── instincts/               # 本能
│   ├── evolved/                 # 进化技能
│   └── observations/            # 观察数据
│
├── projects/                    # 项目记忆
│   └── C--Users-zhang/
│       └── memory/              # 记忆文件
│           └── vector-store.json # 向量存储数据
│
├── bin/                         # 辅助脚本
└── hooks/                       # Hook 脚本
```

## 🧪 测试

### 运行测试

```bash
# 运行全部 Workflow 测试
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js

# 运行向量存储测试
node ~/.claude/workflows/__tests__/vector-store.test.js

# 运行 Fleet 引擎测试
cd ~/.claude/skills/ai-embed-hub
python -m unittest tests.test_fleet_engine -v

# 运行记忆层测试
python -m unittest tests.test_memory_layer -v

# 运行文档解析器测试
cd ~/.claude/skills/ai-embed-hub/doc_parser
python -m unittest tests.test_doc_parser -v
```

### 测试覆盖

| 模块 | 测试数 | 状态 |
|------|--------|------|
| Fleet 引擎 | 10 | ✅ |
| 记忆层 | 12 | ✅ |
| 向量存储 | 29 | ✅ |
| 文档解析器 | 18 | ✅ |
| Workflow 测试 | 217 | ✅ |
| **总计** | **286** | ✅ |

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

## 📊 功能特性

### AI-Embed-Hub（项目搜索）

- ✅ Fleet 并行引擎：多 Agent 并行搜索，速度提升 3-5 倍
- ✅ 三层记忆架构：工作记忆 + 短期记忆 + 长期记忆
- ✅ 智能评分：按实际应用/代码质量/Star/创新性筛选
- ✅ GitHub API 集成：自动搜索 AI 嵌入式项目

### 记忆层扩展

- ✅ 向量语义检索：基于 cosine similarity 的语义搜索
- ✅ 关键词检索：传统的关键词匹配
- ✅ 上下文注入：自动格式化记忆为 agent prompt

### 文档解析器

- ✅ TXT 解析：纯文本提取
- ✅ PDF 解析：PyPDF2 支持
- ✅ DOCX 解析：docx2txt 支持
- ✅ OCR 识别：Tesseract 图片文字识别
- ✅ 智能分块：按段落/句子/固定长度分块
- ✅ 向量化存储：文档内容自动向量化

### 安全机制

- ✅ 102 条 AgentShield 规则
- ✅ 九层安全规则体系
- ✅ 安全预检/审计/异常检测
- ✅ 敏感信息脱敏

## 📝 更新日志

### v2.1.0 (2026-06-13)

- ✅ AI-Embed-Hub: GitHub 项目搜索 skill
- ✅ Fleet 并行引擎: 多 Agent 并行执行
- ✅ 向量存储: 语义检索能力（JS + Python）
- ✅ 文档解析器: TXT/PDF/DOCX/OCR
- ✅ 智能分块器: 按段落/句子/固定长度
- ✅ 记忆层扩展: vector_search/add_to_vector/list_vector
- ✅ Tesseract OCR 集成
- ✅ 69 个新测试全部通过

### v2.0.0 (2026-06-12)

- ✅ ECC Phase 2: 102 条规则
- ✅ Homunculus 持续学习系统
- ✅ AgentShield 安全扫描器
- ✅ 分层规则目录

### v1.0.0 (2026-06-08)

- ✅ 五层 Agent 系统初始版本
- ✅ 需求对齐层
- ✅ 安全层
- ✅ 编排层
- ✅ 记忆层
- ✅ 工具层

## 🔗 仓库

- **GitHub**: https://github.com/shuai-yemao/shuai-yemao-chip-agent
- **Gitee**: https://gitee.com/TNSH/omc-config

## 📄 许可证

私有项目，仅供个人使用。
