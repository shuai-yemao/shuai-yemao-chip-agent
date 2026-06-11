# Chip — 五层 Agent 系统

> **系统级 AI 架构师** — 一个可编程、可编排、可记忆的多层 Agent 系统  
> 专为 Claude Code 设计，覆盖从需求对齐到执行交付的完整链路

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Claude%20Code-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)

---

## 目录

- [设计思路](#设计思路)
- [系统架构](#系统架构)
- [工作流程](#工作流程)
- [文件夹结构](#文件夹结构)
- [涉及的 Skills](#涉及的-skills)
- [安装](#安装)
- [快速开始](#快速开始)
- [使用方法](#使用方法)
- [许可](#许可)

---

## 设计思路

### 核心问题

AI 编程助手面临几个固有矛盾：

| 矛盾 | 说明 |
|------|------|
| **模糊需求 vs 精确执行** | 用户说"做个 LED 控制"，但需要确定引脚、频率、模式等几十个参数 |
| **自由行动 vs 安全边界** | Agent 能写能删，但哪些操作需要确认？哪些绝对不能做？ |
| **单线程 vs 并行效率** | 大任务拆成子任务后，串行太慢，但并行需要编排和门禁 |
| **短会话 vs 长期记忆** | 每次对话都是新的，但过去踩过的坑应该被记住 |

### 五层解耦

Chip 用**五层架构**分别解决这些矛盾，每一层只关注自己的职责：

```
                用户模糊需求
                      │
                      ▼
            ┌─────────────────────┐
            │   需求对齐层         │  ← 把模糊变精确
            │   (Guide Mode)      │
            └────────┬────────────┘
                     │
            ┌────────▼────────────┐
            │     安全层           │  ← 可编程安全护栏
            │   (Safety Layer)    │
            └────────┬────────────┘
                     │
            ┌────────▼────────────┐
            │     编排层           │  ← 并行 + 门禁 + 重试
            │   (Orchestration)   │
            └────────┬────────────┘
                     │
            ┌────────▼────────────┐
            │     记忆层           │  ← 跨会话持久化
            │   (Memory Layer)    │
            └─────────────────────┘

  ┌─────────────────────┐  ┌─────────────────────┐
  │     工具层           │  │     Ops 层           │
  │  技能包管理器        │  │  系统运维 + 打包分发  │
  └─────────────────────┘  └─────────────────────┘
```

### 设计原则

1. **逐层门禁** — 每层为下一层提供确定性输入，不上交模糊性
2. **正交管理平面** — 工具层和 Ops 层不参与管线，分别管理技能和系统
3. **编程安全护栏** — AGENTS.md 编码为可执行的安全规则，而非建议
4. **Diff + 确认** — 更新/恢复等操作先预览再执行，不静默变更
5. **先协议后实现** — 每层先定义接口契约，再填充内部逻辑

---

## 系统架构

### 1. 需求对齐层（Guide Mode）

**文件**: `workflows/requirements-alignment.js`

将用户模糊需求转化为精确的施工清单。采用"Grill 模式"——像烧烤一样反复翻面追问，直到需求两面焦黄清晰。

**流程**:
```
Step 1: grill-me          → 一问一答逐条追问，锚定方向
Step 2: grill-with-docs   → 对照文档和 PRD 梳理约束
Step 2.5: 六源对齐审查    → Skills / Web / GitHub / 记忆 / 真伪验证
Step 3: 4 张施工清单      → 现状 / 约束 / 文件 / 验收（全部需确认）
Step 4: to-issues         → 拆解为可执行的垂直切片
```

**输出**: `guide + checklist_templates[] + acceptance[]`

### 2. 安全层（Safety Layer）

**文件**: `workflows/safety-layer.js`

将 AGENTS.md 中的 9 大规则体系编码为可编程安全护栏。所有操作经此层预检后才能执行。

**能力**:
- **预检** — 执行前检查文件权限、操作风险、领域约束
- **权限控制** — 文件访问白名单、命令执行黑名单
- **高危确认** — 嵌入式专属（烧录/改 linker script/配置时钟等）
- **隐私过滤** — API Key / Token / 芯片 UID 自动脱敏
- **审计日志** — 所有高危操作记录可追溯
- **异常检测** — 模式识别（高频高危/权限试探/信息外泄）

### 3. 编排层（Orchestration）

**文件**: `workflows/agent-orchestration.js`

DAG 调度 + 并行分发 + 三层门禁 + 重试。将大任务分解为子任务并并行执行。

**特性**:
- DAG 依赖解析（拓扑排序）
- 并行 agent 分发（自动限流）
- 三层门禁（前置条件 → 执行确认 → 验收门禁）
- 自动重试（失败后按策略重试，非简单重复）
- 阶段回调（每阶段完成可触发后处理）

### 4. 记忆层（Memory Layer）

**文件**: `workflows/memory-layer.js`

跨会话持久化记忆，解决 LLM 的"金鱼记忆"问题。

**操作**:
- `search` — 语义搜索历史经验
- `read` / `write` / `delete` — 单条记忆读写
- `context` — 为当前任务检索相关记忆并注入上下文
- `list` — 列出所有记忆索引

### 5. 工具层（Tool Layer）

**文件**: `workflows/tool-layer.js`

技能包管理器，管理 `~/.claude/skills/` 下所有技能包的**生命周期**。

**操作**:
- `list` — 列出所有技能（registered / orphaned / archived）
- `install` — 从 Git URL 安装新技能
- `remove` — 卸载技能（检查反向依赖）
- `update` — diff + 确认模式更新
- `deps-tree` — 依赖关系分析
- `adopt` — 收养已有技能到工具层管理

**设计原则**: 不与 Claude Code 原生发现机制竞争，装饰而非替代。

### 6. Ops 层（Ops Layer）

**文件**: `workflows/ops-layer.js`

系统运维 + 打包分发，管理 `~/.claude/` 整体的生命周期。

**操作**:
- `health` — 系统健康检查（代理/环境/钩子/Workflow/技能/记忆）
- `backup` — 全量备份
- `restore` — 从备份恢复（dry-run 预览）
- `package` — 打包为可移植安装包
- `deploy` — 远程部署
- `doctor` — 诊断 + 自动修复
- `prune` — 清理过期数据

---

## 工作流程

### 启动新需求的完整流程

```
1. 需求对齐
   └─ Workflow({ name: 'requirements-alignment',
        args: { requirement: '需求描述' } })
        → 输出 4 张施工清单

2. 清单确认（在对话中逐条确认）
   现状确认表 → 约束清单 → 文件施工名单 → 验收测试清单

3. 执行
   └─ Workflow({ name: 'agent-orchestration',
        args: { tasks: 已确认清单, acceptance: 验收标准 } })
        → 安全层 Phase 0.5 预检
        → 编排层并行调度
        → 安全层 Phase 2.5 审计

4. 验证交付
   每批完成 → 编译 → 验证 → 你判决
```

### 日常操作

```javascript
// 检查系统状态
Workflow({ name: 'ops-layer', args: { action: 'health' } })

// 查记忆
Workflow({ name: 'memory-layer', args: { action: 'search', query: '关键词' } })

// 管理技能
Workflow({ name: 'tool-layer', args: { action: 'list' } })

// 备份
Workflow({ name: 'ops-layer', args: { action: 'backup' } })
```

---

## 文件夹结构

```
chip-system/
│
├── CLAUDE.md              # 系统架构文档（Claude Code 自动读取）
├── SOUL.md                # Chip 人格定义（session-start hook 注入）
├── AGENTS.md              # AI 行为守则（安全规则体系）
├── USER.md                # 用户信息与偏好
├── config.json            # 默认配置模板
├── settings.chip.json     # Chip 优化设置参考
│
├── workflows/             # 六层 Workflow 脚本
│   ├── requirements-alignment.js
│   ├── safety-layer.js
│   ├── agent-orchestration.js
│   ├── memory-layer.js
│   ├── tool-layer.js
│   └── ops-layer.js
│
├── domains/               # 领域配置
│   ├── embedded.js        # 嵌入式领域预检规则
│   └── generic.js         # 通用领域预检规则
│
├── hooks/                 # Claude Code 会话钩子
│   └── session-start      # 自动注入 SOUL.md + AGENTS.md + 代理启动
│
├── bin/                   # 辅助脚本
│   └── deepseek-proxy.js  # DeepSeek API 代理
│
├── installer/             # NSIS Windows 安装包
│   ├── chip-installer.nsi
│   ├── files/
│   │   ├── bin/chip-welcome.bat
│   │   └── LICENSE.txt
│   └── build-installer.bat
│
├── scripts/               # 安装脚本
│   ├── setup.sh           # Unix / macOS / Linux
│   └── setup.ps1          # Windows PowerShell
│
├── skills/                # 技能包加载说明
│   └── README.md
│
├── memory/                # 记忆层数据目录（运行时生成）
│   └── README.md
│
├── docs/
│   └── CHIP.md            # 本文件（完整设计文档）
│
├── README.md              # 仓库首页（本文）
├── LICENSE                # MIT 许可
└── .gitignore
```

---

## 涉及的 Skills

Chip 系统依赖两类技能：

### 内置 Workflow（Chip 原创）

| Workflow | 行数 | 职责 | 配套 Skill |
|----------|------|------|-----------|
| `requirements-alignment` | ~400 | 需求对齐层 | grill-me, grill-with-docs, to-prd |
| `safety-layer` | ~650 | 安全层 | — |
| `agent-orchestration` | ~450 | 编排层 | — |
| `memory-layer` | ~400 | 记忆层 | — |
| `tool-layer` | ~430 | 工具层 | — |
| `ops-layer` | ~430 | Ops 层 | — |

### 外部技能包（需单独安装）

130+ 技能包来自 [mattpocock/skills](https://github.com/mattpocock/skills)，涵盖：

| 分类 | 示例技能 |
|------|----------|
| **嵌入式底层** | I²C, SPI, UART, CAN, USB, DMA, Timer, ADC, PWM, CRC |
| **MCU 架构** | ARM Cortex Registers, Interrupt Exception, Memory Architecture |
| **RTOS** | FreeRTOS, RTOS Debug |
| **无线通信** | BLE, WiFi, LoRa, GPS, Cellular, MQTT |
| **构建系统** | CMake, IAR, Keil, ESP-IDF, PlatformIO |
| **调试分析** | GDB+OpenOCD, RTT, CmBacktrace, Map Analyzer |
| **安全固件** | AES, RSA, CRC, Firmware Sign, OTA, Bootloader |
| **工程方法** | TDD, Diagnose, Triage, Code Review, Prototype |
| **生产力** | Handoff, Note-taking, Workflow Management |

---

## 安装

### 前提条件

- [Claude Code](https://claude.ai/code) (推荐) 或 [OpenCode](https://github.com/anomalyco/opencode)
- Node.js 18+
- Git

### 快速安装（推荐）

```bash
# 克隆仓库
git clone https://github.com/shuai-yemao/shuai-yemao-chip-agent.git ~/.claude
cd ~/.claude

# 运行安装脚本
bash scripts/setup.sh

# 安装外部技能包
bash scripts/install-skills.sh
```

### Windows 安装（NSIS 安装包）

1. 从 Releases 下载 `Chip-System-Setup.exe`
2. 双击运行，按向导完成安装
3. 编辑 `%USERPROFILE%\.claude\settings.json`，填入 API Key

### 手动安装

```bash
# 1. 复制核心文件
cp -r workflows ~/.claude/
cp -r hooks ~/.claude/
cp -r domains ~/.claude/
cp -r bin ~/.claude/
cp CLAUDE.md SOUL.md AGENTS.md USER.md config.json ~/.claude/

# 2. 授予钩子执行权限
chmod +x ~/.claude/hooks/session-start

# 3. 安装技能包
ALL_PROXY=socks5://127.0.0.1:7897 git clone --depth 1 \
  https://github.com/mattpocock/skills.git /tmp/skills && \
  cp -r /tmp/skills/skills/* ~/.claude/skills/

# 4. 配置 API Key
# 编辑 ~/.claude/settings.json，设置 ANTHROPIC_AUTH_TOKEN
```

### 首次配置

安装后需要：

1. **设置 API Key** — 在 `~/.claude/settings.json` 中设置 `ANTHROPIC_AUTH_TOKEN`
2. **配置 DeepSeek 代理**（可选）— 如使用 DeepSeek 后端，设置 `ANTHROPIC_BASE_URL=http://localhost:17999`
3. **验证安装** — 启动 Claude Code，运行 `Workflow({ name: 'ops-layer', args: { action: 'health' } })`

---

## 快速开始

### 新手示例：LED 控制

```javascript
// 1. 输入需求
Workflow({
  name: 'requirements-alignment',
  args: { requirement: '用 STM32F411 做一个 LED 呼吸灯，按键切换模式' }
})

// 2. 对话确认 4 张清单

// 3. 开始执行
Workflow({
  name: 'agent-orchestration',
  args: {
    tasks: [
      { id: 'gpio-init', description: '初始化 GPIO 和定时器', depends_on: [] },
      { id: 'pwm-config', description: '配置 PWM 呼吸效果', depends_on: ['gpio-init'] },
      { id: 'key-scan', description: '按键扫描与模式切换', depends_on: ['gpio-init'] }
    ],
    acceptance: [
      'LED 能从 0%-100% 渐变',
      '按键切换常亮/呼吸/灭'
    ]
  }
})
```

### 常用命令速查

```javascript
// ===== 需求管理 =====
// 启动需求对齐
Workflow({ name: 'requirements-alignment', args: { requirement: '...' } })

// ===== 技能管理 =====
// 查看所有技能状态
Workflow({ name: 'tool-layer', args: { action: 'list' } })
// 安装技能
Workflow({ name: 'tool-layer', args: { action: 'install', source: 'git-url' } })
// 分析依赖
Workflow({ name: 'tool-layer', args: { action: 'deps-tree' } })

// ===== 记忆管理 =====
// 搜索历史经验
Workflow({ name: 'memory-layer', args: { action: 'search', query: 'I2C' } })
// 获取当前任务上下文
Workflow({ name: 'memory-layer', args: { action: 'context', for: '当前任务' } })

// ===== 系统运维 =====
// 健康检查
Workflow({ name: 'ops-layer', args: { action: 'health' } })
// 备份
Workflow({ name: 'ops-layer', args: { action: 'backup' } })
// 诊断
Workflow({ name: 'ops-layer', args: { action: 'doctor' } })
// 清理
Workflow({ name: 'ops-layer', args: { action: 'prune', days: 30 } })
```

---

## 许可

[MIT License](LICENSE) — 自由使用、修改、分发，需保留版权声明。

第三方技能包的各上游仓库许可条款同样适用。

---

## 贡献

欢迎提交 Issue 和 PR！

- **报告 Bug** — 请描述复现步骤和环境
- **功能请求** — 请说明使用场景
- **提交代码** — 请先开 Issue 讨论设计

---

*Chip —— 系统级 AI 架构师，让你的 Agent 更聪明、更安全、更持久。*
