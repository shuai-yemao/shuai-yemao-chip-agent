# Chip Alignment Refactor

> 配置文件重构项目。四层 Agent 系统已在项目内完整部署。

## 系统架构

```
┌────────────────────────────────────────────────┐
│  用户模糊需求  →  "给 STM32F4 加 I²C 驱动"      │
└────────────────┬───────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────┐
│  需求对齐层  ←  Workflow 直接调用               │
│  .claude/workflows/requirements-alignment.js   │
│  4 步: 锚定→约束→清单→施工包                    │
│  输出: tasks[] + acceptance[]                  │
└────────────────┬───────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────┐
│  安全层  ←  自动注入编排层 Phase 0.5            │
│  .claude/workflows/security-layer.js           │
│  AGENTS.md 规则 → 可编程安全护栏                │
│  预检/权限检查/高危确认/隐私过滤/审计/异常检测  │
└────────────────┬───────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────┐
│  编排层  ←  接收施工包执行                      │
│  .claude/workflows/agent-orchestration.js      │
│  DAG 调度 + 并行分发 + 三层门禁 + 重试          │
│  安全层集成: Phase 0.5 预检 + Phase 2.5 审计    │
└───────────────┬────────────────────────────────┘
                 ▼
┌────────────────────────────────────────────────┐
│  记忆层  ←  贯穿上下文的持久化知识               │
│  .claude/workflows/memory-layer.js             │
│  Phase 0: 上下文注入 / Phase 5: 写回执行摘要    │
│  同时作为安全层的审计日志存储后端                 │
└────────────────────────────────────────────────┘
```

## 日常使用

### 启动新需求

对任意嵌入式开发任务，直接说你的需求，我会自动走 Alignment Flow：

```
Workflow({ name: 'requirements-alignment', args: { requirement: '<你的需求描述>' } })
```

输出施工包后，直接喂给编排层：

```
Workflow({ name: 'agent-orchestration', args: { tasks: <上一步输出的tasks>, acceptance: <上一步输出的acceptance> } })
// 默认 domain='embedded'（嵌入式领域），切通用传 domain: 'generic'
```

### 记忆操作

```
Workflow({ name: 'memory-layer', args: { action: 'search', query: 'I2C' } })
Workflow({ name: 'memory-layer', args: { action: 'write', name: 'xxx', type: 'decision', content: '...' } })
```

### 安全层操作（独立调用，也可由编排层自动触发）

```
# 预检一个任务的安全性
Workflow({ name: 'security-layer', args: { action: 'preflight', task: { name: '操作', files: ['.env'], command: '' }, domain: 'embedded' } })

# 检查文件权限
Workflow({ name: 'security-layer', args: { action: 'check_permission', path: '.env', operation: 'read' } })

# 检查命令是否在黑名单中
Workflow({ name: 'security-layer', args: { action: 'check_command', command: 'rm -rf /' } })

# 隐私脱敏过滤
Workflow({ name: 'security-layer', args: { action: 'filter', text: '包含敏感信息的文本' } })

# 审计日志记录
Workflow({ name: 'security-layer', args: { action: 'audit', entry: { type: 'file-delete', path: '/tmp/x.log' }, session: 'current-session' } })

# 异常模式检测
Workflow({ name: 'security-layer', args: { action: 'anomaly_check', log: [...], session: 'current-session' } })

# 生成安全规则注入块
Workflow({ name: 'security-layer', args: { action: 'inject_rules', domain: 'embedded' } })

# 注册规则豁免（session 维度，跨 action 保持）
Workflow({ name: 'security-layer', args: { action: 'override', rule_id: 'emb-no-modify-vendor-files', reason: '已确认影响范围', session: 'sess-001' } })

# 查看当前 session 安全状态
Workflow({ name: 'security-layer', args: { action: 'session_status', session: 'sess-001' } })
# → 返回: { session_id, active_overrides: [...], operation_count, violations_count }
```

### 前提条件

- **DeepSeek API 代理** 通过全局 `session-start` hook 自动启动在 `localhost:17999`
- 所有 `agent()` 调用经过代理转发，剥离 `reasoning_effort` + `thinking:disabled` 参数
- 设置：`ANTHROPIC_BASE_URL=http://localhost:17999`（在 `~/.claude/settings.json`，全局生效）

## 项目结构

```
.
├── CLAUDE.md           ← 项目入口（本文件）
├── SOUL.md             ← AI 人格：Chip — 系统级架构师
├── AGENTS.md           ← 行为守则：权限、边界、高危操作
├── memory.md           ← 记忆系统架构说明
├── memory/             ← 持久化记忆文件（git 管理）
├── skills/             ← 本地 skill 文件
├── scripts/
│   └── deepseek-proxy.js    ← DeepSeek API 兼容代理
└── .claude/
    ├── settings.json        ← 项目级设置
    ├── hooks/
    │   └── session-start    ← 自动启动 API 代理
    └── workflows/
        ├── requirements-alignment.js  ← 需求对齐层
        ├── security-layer.js          ← 安全层（AGENTS.md 规则引擎）
        ├── agent-orchestration.js     ← 编排层
        └── memory-layer.js            ← 记忆层
```

## 环境约定

- **Shell**: Bash（Windows 11 + Git Bash）
- **路径风格**: Unix 风格（`C:/` → `/c/`）
- **编辑器**: VS Code
- **Git**: master 分支
- **API 代理**: `scripts/deepseek-proxy.js`，端口 17999

## 安全层须知

### 资源限制声明

资源限制中的 Token 消耗和并发任务数属于 **建议性（advisory）约束**，因为 LLM API 端点和 Node.js 事件循环不提供精确的 token/并发控制基元。硬性约束（文件权限、命令黑名单、高危操作确认流）由 security-layer.js 的程序化检查强制执行。

### Override 使用场景

Override 机制用于 **临时绕过** 特定安全规则（如用户已确认某厂商文件修改的安全性）。规则：
- 同一 session 内有效，跨 session 过期
- 必须提供 `rule_id` + `reason`，记录到审计日志
- 命令级 override 用 `cmd:<pattern>` 作为 rule_id

### 异常检测输出

`anomaly_check` 返回 `{ has_anomaly, anomalies: [{ type, detail, severity, evidence }] }`。
检测的 5 种异常模式：

| 模式 | 严重度 | 触发条件 |
|------|:------:|----------|
| 高频高危操作 | warning | 单 session > 3 次 deny |
| 权限试探 | critical | 单 session > 5 次拒绝 |
| 异常命令链 | warning | 正常流程中不出现的命令组合 |
| 信息外泄嫌疑 | critical | 向未知端点发送数据/凭据 |
| 规则漂移 | info | 同一类操作越来越频繁跳过确认 |

### 热加载生效时间

修改文件后，系统需要短暂时间完成热加载。**不需要手动重启**，等待几秒即可生效。频繁重启反而会打断加载流程。

### 混合检索权重平衡

混合检索（关键词 + 语义）的权重分配需注意平衡：

- 偏关键词 → 丢失语义关联，找不到同义/相关结果
- 偏语义 → 丢失精准匹配，返回噪声结果

推荐策略：语义检索作为召回层，关键词作为精排层，优先保证精准度。
