SOUL.md（Chip 人格）和 AGENTS.md（行为守则）由 session-start hook 自动注入，CLI 和 VS Code 均生效。

**五层 Agent 系统已全局部署。** 任意目录下可直接调用 Workflow。

## 系统架构

```
用户模糊需求
     │
     ├────────────────────────────────────────────┐
     │  主 Agent 立即开始交互（不等待 workflow）     │
     │  调用 brainstorming 技能开始第一轮提问       │
     └────────────────────────┬────────────────────┘
                              │
     ┌────────────────────────┴────────────────────┐
     │  需求对齐层（异步预处理）                     │
     │  Workflow({ name: 'requirements-alignment' })│
     │  后台运行: 记忆检索 + 领域预判 + 模板生成     │
     │  结果注入对话作为参考                         │
     └────────────────────────┬────────────────────┘
                              │
     ┌────────────────────────┴────────────────────┐
     │  交互式引导（主 Agent 在对话中执行）          │
     │  Step 1: grill-me 锚定方向（无情追问）        │
     │  Step 2: grill-with-docs 确认技术约束        │
     │  Step 2.5: 六源对齐审查（Skills/Web/KB）     │
     │  Step 3: 对话确认 4 张施工清单                │
     │  Step 4: to-issues 拆解 → 验收确认           │
     └────────────────────────┬────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────┐
│  安全层                                                   │
│  Workflow({ name: 'safety-layer' })                     │
│  AGENTS.md 规则 → 可编程安全护栏                           │
│  预检/权限/高危确认/隐私过滤/审计/异常检测                   │
│  自动注入编排层 Phase 0.5                                  │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│  编排层                                                   │
│  Workflow({ name: 'agent-orchestration' })                │
│  DAG 调度 + 并行分发 + 三层门禁 + 重试                     │
│  安全集成: Phase 0.5 预检 + Phase 2.5 审计                 │
└───────────────────────┬──────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│  记忆层                                                   │
│  Workflow({ name: 'memory-layer' })                       │
│  检索 / 读写 / 上下文注入                                  │
│  同时作为安全层审计日志存储后端                              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐
│  Ops 层（系统运维 + 打包分发）             │  │  工具层（技能包管理器）                    │
│  Workflow({ name: 'ops-layer' })          │  │  Workflow({ name: 'tool-layer' })        │
│  健康检查 / 备份 / 恢复 / 打包 / 部署     │  │  安装 / 卸载 / 更新 / 列表 / 依赖分析    │
│  诊断 / 清理                             │  │  收养 (adopt)                            │
│  管理 ~/.claude/ 整体生命周期             │  │  管理 skills/ 下的技能生态                │
│  🔴 含系统级备份/恢复/部署等不可逆操作     │  │  ⚡ 管理所有 layer 依赖的技能包           │
└──────────────────────────────────────────┘  └──────────────────────────────────────────┘
```

## 链式触发（Chain Triggers）

每个 Workflow 的输出中包含 `chain` 元数据字段，由主 agent 读取并按指引自动衔接后续步骤。

### 工作机制

```
Workflow A 输出
     │
     ├─ chain.flow.next_conversations[]  → 主 agent 在对话中逐条执行
     │                                        （grill-me / 约束梳理 / 审查 / 确认）
     │
     ├─ chain.flow.next_workflow         → 条件满足后自动调 Workflow B
     │                                        （数据转发 + args_forwarding）
     │
     └─ chain.on_error                   → 异常时触发审计链路
```

### 链路一览

| 源 Workflow | 链类型 | 目标 | 条件 |
|------------|--------|------|------|
| `requirements-alignment` | 会话指引 | 4 步对话（grill-me → 约束梳理 → 六源审查 → 清单确认） | 输出即触发 |
| `requirements-alignment` | 数据转发 | `agent-orchestration` | 全部清单确认后 |
| `agent-orchestration` | 完成链路 | `memory-layer save` + `safety-layer audit` | 所有任务 verdict === 'pass' |
| `agent-orchestration` | 部分链路 | `memory-layer save`（进度存档） | 部分任务完成 |
| `agent-orchestration` | 中止链路 | `safety-layer audit` | 用户说「停」|
| 任意 Workflow | 异常链路 | `safety-layer audit` | 执行出错 |

### 主 agent 如何消费 chain 元数据

1. Workflow 执行完毕后，读取返回结果的 `chain` 字段
2. 按 `chain.flow.next_conversations[]` 顺序执行对话步骤
3. 每个步骤完成后，将用户确认的数据存储到 `data_scope.output_key`
4. 所有步骤完成 → 按 `chain.flow.next_workflow.args_forwarding` 组装参数 → 调下一个 Workflow
5. 执行过程中根据 `chain.executing.task_trackers` 追踪每个任务的状态
6. 全部通过 → 执行 `chain.on_completion` 链路（保存到记忆层 + 审计）
7. 用户中止 → 执行 `chain.on_cancel` 链路

### 示例

```javascript
// requirements-alignment 输出中的 chain 结构：
chain: {
  status: 'preprocess_complete',
  flow: {
    next_conversations: [
      { id: 'grill_me', step: 1, title: '锚定方向', ... },
      { id: 'constraint_review', step: 2, title: '约束梳理', ... },
      { id: 'six_source_review', step: 3, title: '六源对齐审查', ... },
      { id: 'checklist_confirm', step: 4, title: '清单确认', ... },
    ],
    next_workflow: {
      name: 'agent-orchestration',
      when: 'after_checklist_confirmed',
      args_forwarding: {
        tasks: 'from confirmed_checklists → to-issues 拆解结果',
        acceptance: 'from confirmed_checklists.acceptance',
        domain: 'from domain detection',
      },
    },
    on_error: {
      name: 'safety-layer',
      args: { action: 'audit', entry: { type: 'alignment_error' } },
    },
  },
}
```

```javascript
// agent-orchestration 输出中的 chain 结构：
chain: {
  status: 'guide_ready',
  executing: {
    task_trackers: [/* 主 agent 在执行中更新 status/verdict */],
    acceptance_trackers: [/* 主 agent 在执行中更新 verdict */],
  },
  on_completion: {
    when: 'all_tasks_approved',
    chain: [
      { type: 'save_memory', workflow: 'memory-layer', args_template: { action: 'save', ... } },
      { type: 'audit', workflow: 'safety-layer', args_template: { action: 'audit', ... } },
    ],
  },
  on_cancel: {
    chain: [{ type: 'audit', workflow: 'safety-layer', ... }],
  },
}
```

## 日常使用

### 专用 Agent

系统预定义了 4 个专用 agent，可通过 `--agent` 参数启动：

| Agent | 用途 | 启动方式 |
|-------|------|---------|
| `embedded-expert` | 嵌入式开发专家 | `claude --agent embedded-expert` |
| `code-reviewer` | 代码审查专家 | `claude --agent code-reviewer` |
| `test-runner` | 测试执行专家 | `claude --agent test-runner` |
| `devops` | 运维专家 | `claude --agent devops` |

Agent 定义文件位于 `~/.claude/agents/`，每个 agent 包含角色定义、核心能力、工作流程、工具使用说明。

### 启动新需求（异步模式）

对任意任务需求，按以下流程执行：

```
// 1. 启动需求对齐层（后台异步运行，不等待）
Workflow({
  name: 'requirements-alignment',
  args: { requirement: '<你的需求描述>' }
})

// 2. 主 Agent 立即开始交互式对话（不等 workflow）
//    调用 brainstorming 技能，按 workflow 输出的 grill_questions 逐条追问
```

**执行流程**：
1. 用户发起需求 → 主 Agent 立即调 grill-me 开始对话
2. Workflow 后台运行（<30s），快速完成：记忆检索 + 领域预判 + 模板生成
3. Workflow 完成 → 自动注入记忆层经验到对话
4. 主 Agent 可参考领域分析结果调整提问方向

**交互步骤**：
1. **锚定方向** → 调 `grill-me` 技能，无情追问澄清需求
2. **约束梳理** → 调 `grill-with-docs` 确认技术约束
3. **六源对齐审查** → Skills + WebSearch + GitHub + KB(记忆层) + 真伪验证

   Workflow 已自动检索记忆层中的历史经验（`kb_context`），
   审查时主 Agent 可以直接使用，也建议用 `memory-layer search` 补充检索。

4. **清单确认** → 逐条确认 4 张施工清单（现状/约束/文件/验收）
5. **拆解执行** → 调 `to-issues` 拆解 → 喂给编排层

清单全部确认后交给编排层：

```
Workflow({
  name: 'agent-orchestration',
  args: {
    tasks:      < chain.args_forwarding.tasks      — to-issues 拆解结果 >,
    acceptance: < chain.args_forwarding.acceptance  — 已确认验收项 >,
    domain:     < chain.args_forwarding.domain      — 自动检测领域 >,
  }
})
```

编排层执行期间：

- 主 agent 按 `chain.executing.task_trackers[]` 逐条追踪任务状态
- 每完成任务 → 更新 `task_trackers[id].verdict`
- 全部通过 → 自动触发 `chain.on_completion` 链路（保存到记忆层 + 审计日志）
- 部分完成 → 触发 `chain.on_partial` 保存进度
- 用户说「停」→ 触发 `chain.on_cancel` 记录审计

## AI 推理步骤清单（action_items）

每个 Workflow 输出中包含 `action_items[]` 结构化步骤清单，主 agent 按 step 顺序逐条执行，参考 skill 字段调用对应技能。

**格式**: `{ step, action, title, skill, detail, reason, expects, depends_on, output_key }`

**action 类型**: conversation（对话交互）| skill（调技能）| workflow（调 Workflow）| verify（验证）| review（审查决策）| manual（手动操作）

**各 Workflow 清单长度**: requirements-alignment 5 条 | agent-orchestration 每 Batch 2+N+1 条 | safety-layer 1-2 条 | memory-layer 1-2 条 | tool-layer 1-2 条 | ops-layer 1-2 条

**使用方式**: Workflow 执行后，主 agent 读取 action_items，按 step 顺序逐条执行，skill 指示调用哪个技能，depends_on 保证前置完成。完成后数据存到 output_key（若有）。最后传给 chain.next_workflow。

> 设计原则：action_items 不是可执行代码，是结构化指引，主 agent 在对话上下文中自然消费。

## WorkflowState 共享状态

每个 Workflow 输出中包含 `state` 字段，声明该层生产了什么数据、哪些下游需要消费。主 agent 根据 state 和 chain.flow.next_workflow.args_forwarding 自动装配链式调用的参数。

### state 格式

```javascript
state: {
  produced: {
    key1: 'value1',           // 本层生产的数据
    key2: null,               // null 表示待后续填充
  },
  consumed_by: {
    'next-workflow-name': {
      param1: 'from produced.key1',
      param2: '固定值',
    },
  },
}
```

### 层间数据流一览

| 生产层 | 生产的 state | 消费层 |
|--------|-------------|--------|
| requirements-alignment | domain, keywords, acceptance_templates, clarity_state(null), confirmed_checklists(null) | agent-orchestration(tasks/acceptance/domain) |
| agent-orchestration | batches, task_trackers, task_results(null), completion_summary(null) | memory-layer(save summary), safety-layer(audit) |
| safety-layer | verdict, risk_count, anomaly_count, safe_text | —（编排层直接消费）|
| memory-layer | matches_count, source_count, success, exists | —（主 agent 消费）|
| tool-layer | total, registered, orphaned, success, name, version | —（主 agent 消费）|
| ops-layer | status, success, path, issues_found | —（主 agent 消费）|

### 主 agent 使用方式

1. 读取 Workflow 输出中的 `state.produced`，记录所有非 null 的值
2. 按 `chain.flow.next_workflow.args_forwarding` 的指引，从 `state.produced` 提取对应值装配参数
3. null 值表示需要对话中填充（经 action_items 指引）——填充后更新 state
4. 调下一个 Workflow 时，将装配好的参数传入 args
5. 全部完成后检查 consumed_by 中是否有 finalize 链路（memory-layer save / safety-layer audit）

### 示例

```javascript
// requirements-alignment 产出
state.produced = {
  domain: 'embedded',
  suggested_skills: ['i2c-bus', 'timer-module'],
  acceptance_templates: [...],
  confirmed_checklists: null,  // 待对话填充
}

// chain.next_workflow.args_forwarding:
// tasks  ← confirmed_checklists → to-issues
// acceptance ← confirmed_checklists.acceptance
// domain  ← produced.domain

// 主 agent 填充 confirmed_checklists 后装配:
Workflow({
  name: 'agent-orchestration',
  args: {
    tasks:      confirmed_checklists → to-issues 结果,
    acceptance: confirmed_checklists.acceptance,
    domain:     'embedded',        // from state.produced.domain
  }
})
```

### 记忆操作

```
Workflow({ name: 'memory-layer', args: { action: 'search', query: 'I2C' } })
Workflow({ name: 'memory-layer', args: { action: 'context', for: '当前任务' } })
```

### 安全层操作（编排层自动触发，也可独立使用）

```
# 预检任务安全性
Workflow({ name: 'safety-layer', args: { action: 'preflight', task: { name: '操作', files: ['.env'], command: '' }, domain: 'embedded' } })

# 检查文件权限
Workflow({ name: 'safety-layer', args: { action: 'check_permission', path: '.env', operation: 'read' } })

# 隐私脱敏
Workflow({ name: 'safety-layer', args: { action: 'filter', text: '含敏感信息的文本' } })

# 审计日志
Workflow({ name: 'safety-layer', args: { action: 'audit', entry: { type: '高危操作', path: '...' }, session: '当前会话' } })

# 异常检测
Workflow({ name: 'safety-layer', args: { action: 'anomaly_check', log: [...], session: '当前会话' } })

# 安全规则注入 prompt
Workflow({ name: 'safety-layer', args: { action: 'inject_rules', domain: 'embedded' } })
```

### 工具层操作

```
# 列出所有技能（含注册/孤立/归档状态）
Workflow({ name: 'tool-layer', args: { action: 'list' } })

# 技能分类地图（10 个分类 × 53+ 技能）
Workflow({ name: 'tool-layer', args: { action: 'map' } })
Workflow({ name: 'tool-layer', args: { action: 'map', category: '通信协议' } })
Workflow({ name: 'tool-layer', args: { action: 'map', task: 'I2C' } })

# 版本身份清单 + 批量检查
Workflow({ name: 'tool-layer', args: { action: 'version' } })
Workflow({ name: 'tool-layer', args: { action: 'check' } })

# 安装技能（从 Git URL）
Workflow({ name: 'tool-layer', args: { action: 'install', source: 'git-url' } })

# 卸载技能（检查依赖后移除）
Workflow({ name: 'tool-layer', args: { action: 'remove', name: 'skill-name' } })

# 强制卸载（忽略依赖检查）
Workflow({ name: 'tool-layer', args: { action: 'remove', name: 'skill-name', force: true } })

# 检查更新（先显示 diff，不执行）
Workflow({ name: 'tool-layer', args: { action: 'update', name: 'skill-name' } })

# 确认更新（带上 confirm 执行）
Workflow({ name: 'tool-layer', args: { action: 'update', name: 'skill-name', confirm: true } })

# 依赖分析
Workflow({ name: 'tool-layer', args: { action: 'deps-tree' } })

# 收养已有技能（注册到工具层管理）
Workflow({ name: 'tool-layer', args: { action: 'adopt', name: 'skill-name' } })
```

### Ops 层操作

```
# 系统版本信息（组件版本号 + 更新历史）
Workflow({ name: 'ops-layer', args: { action: 'version' } })

# 系统健康检查（所有组件状态一览）
Workflow({ name: 'ops-layer', args: { action: 'health' } })

# 全量备份（配置 + 记忆 + Workflow + 钩子）
Workflow({ name: 'ops-layer', args: { action: 'backup' } })

# 预览恢复（dry-run，看影响范围）
Workflow({ name: 'ops-layer', args: { action: 'restore', from: 'path/to/backup.tar.gz', dryRun: true } })

# 执行恢复
Workflow({ name: 'ops-layer', args: { action: 'restore', from: 'path/to/backup.tar.gz' } })

# 打包分发包（最小化可移植安装包）
Workflow({ name: 'ops-layer', args: { action: 'package' } })

# 部署到远程机器
Workflow({ name: 'ops-layer', args: { action: 'deploy', target: 'user@host:/path' } })

# 系统诊断 + 自动修复常见问题
Workflow({ name: 'ops-layer', args: { action: 'doctor' } })

# 清理过期数据（默认保留 30 天）
Workflow({ name: 'ops-layer', args: { action: 'prune' } })

# 指定保留天数
Workflow({ name: 'ops-layer', args: { action: 'prune', days: 7 } })
```

### Homunculus 持续学习系统

Homunculus 是 PostCompact hook 驱动的观察-分析-学习闭环系统。自动从会话历史（`history.jsonl`）中提取工具调用模式，分析后生成"本能"（instincts）存入 `~/.claude/homunculus/`。

**架构**:
- `bin/homunculus-hook.js` — PostCompact hook：增量读取 history.jsonl，提取实质工具调用
- `workflows/homunculus-observer.js` — 分析引擎：子 agent 读取观察数据，识别重复模式
- `homunculus/homunculus-config.yml` — 配置：置信度演进、冷却时间、桥接阈值

**操作**:
```
# 查看系统状态
Workflow({ name: 'homunculus-observer', args: { action: 'status' } })

# 增量捕获新观察
Workflow({ name: 'homunculus-observer', args: { action: 'capture' } })

# 分析模式并提取本能（建议冷却间隔 15 分钟）
Workflow({ name: 'homunculus-observer', args: { action: 'analyze' } })
```

**本能演进**:
- 置信度 0.3（1-2 次出现）→ 0.5（3-5 次）→ 0.7（6-10 次）→ 0.85（11+ 次）
- `confidence >= 0.7` 时自动桥接到记忆层（`memory-layer save`）
- 本能文件存储于 `~/.claude/homunculus/instincts/personal/{slug}.md`

**Hook 注册**: PostCompact hook 通过 `~/.claude/settings.json` 注册，每次会话压缩后自动调用。

### AgentShield 安全扫描器

AgentShield 是独立配置安全静态扫描器。扫描 `~/.claude/` 下配置文件，检测密钥泄露、MCP 风险、权限过宽、Hook 安全、Agent 配置漂移。

**架构**:
- `workflows/agentshield-scanner.js` — 扫描引擎：子 agent 读取配置文件，应用规则
- `workflows/agentshield-rules.js` — 规则库：35+ 规则，五大类（keys/mcp/permissions/hooks/agents）

**操作**:
```
# 全量扫描（所有 scope）
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'all' } })

# 按类别扫描
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'keys' } })
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'mcp' } })
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'permissions' } })
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'hooks' } })
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'agents' } })
```

**评分体系**: 满分 100，按 severity 扣分（critical:25, high:15, medium:10, low:5）。等级 A(>=90) / B(>=70) / C(>=50) / D(>=30) / F。

**规则覆盖**:
- KEY（10 条）: Anthropic/OpenAI/AWS/GitHub 密钥、JWT、数据库连接串、私钥引用
- MCP（10 条）: HTTP 明文、npx -y 自动安装、凭据文件引用、autoApprove、0.0.0.0 绑定
- PERM（5 条）: allow(*) 通配、Bash(*) 全放开、defaultMode auto、Workflow 组合风险
- HOOK（5 条）: 危险命令、阻塞模式、超时过长、路径错误、残留禁用 hook
- AGENT（5 条）: 工具权限过多、模型过强、缺少约束/作用域、重复定义

**测试**:
```
# 全部测试（通过 Workflow 引擎）
Workflow({ name: '__tests__/run-all-workflow-tests' })

# 单个测试文件
Workflow({ name: '__tests__/run-all-workflow-tests', args: { file: 'homunculus-observer.test.js' } })

# 独立运行（无需 Workflow 引擎）
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js --file homunculus-observer.test.js

# 快速独立 runner（调试用）
node ~/.claude/workflows/__tests__/run-homunculus-test.js
node ~/.claude/workflows/__tests__/run-agentshield-test.js
```

## 环境

- **DeepSeek API 代理**: 自动通过 `session-start` hook 启动在 `localhost:17999`
- **所有 agent() 调用** 经过代理转发，剥离 `reasoning_effort` + `thinking:disabled` 参数
- **设置**: `ANTHROPIC_BASE_URL=http://localhost:17999`（在 `~/.claude/settings.json`）

## 约束

- 5 步走完前不执行
- 不可逆操作等确认
- 「停」「不对」「换方向」立即中止
- 工具层操作（install/remove/update）经安全层 Phase 0.5 预检后方可执行
- Ops 层操作（restore/deploy/backup）涉及系统级写入，必须逐条确认

> 安全层已自动加载 AGENTS.md 规则体系。编排层任务执行前会经 Phase 0.5 安全预检（文件权限检查/高危操作识别/嵌入式专属约束），Phase 2.5 写入审计日志。违反规则的操作会被阻止或标记需确认。
> 工具层操作经安全层预检；Ops 层 restore/deploy 为不可逆操作，需额外人工确认。
