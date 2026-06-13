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
│  工具层（技能包管理器）                    │  │  Ops 层（系统运维 + 打包分发）             │
│  Workflow({ name: 'tool-layer' })        │  │  Workflow({ name: 'ops-layer' })          │
│  安装 / 卸载 / 更新 / 列表 / 依赖分析    │  │  健康检查 / 备份 / 恢复 / 打包 / 部署     │
│  收养 (adopt)                            │  │  诊断 / 清理                             │
│  管理 skills/ 下的技能生态                │  │  管理 ~/.claude/ 整体生命周期             │
│  ⚡ 管理所有 layer 依赖的技能包           │  │  🔴 含系统级备份/恢复/部署等不可逆操作     │
└──────────────────────────────────────────┘  └──────────────────────────────────────────┘
```

## 日常使用

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
  args: { tasks: <已确认的tasks>, acceptance: <已确认的acceptance> }
})
```

### 记忆操作

```
Workflow({ name: 'memory-layer', args: { action: 'search', query: 'I2C' } })
Workflow({ name: 'memory-layer', args: { action: 'context', for: '当前任务' } })
```

### 安全层操作（编排层自动触发，也可独立使用）

```
Workflow({ name: 'safety-layer', args: { action: 'preflight', task: { name: '操作', files: ['.env'], command: '' }, domain: 'embedded' } })
Workflow({ name: 'safety-layer', args: { action: 'check_permission', path: '.env', operation: 'read' } })
Workflow({ name: 'safety-layer', args: { action: 'filter', text: '含敏感信息的文本' } })
Workflow({ name: 'safety-layer', args: { action: 'audit', entry: { type: '高危操作', path: '...' }, session: '当前会话' } })
Workflow({ name: 'safety-layer', args: { action: 'anomaly_check', log: [...], session: '当前会话' } })
Workflow({ name: 'safety-layer', args: { action: 'inject_rules', domain: 'embedded' } })
```

### 工具层操作

```
Workflow({ name: 'tool-layer', args: { action: 'list' } })
Workflow({ name: 'tool-layer', args: { action: 'map' } })
Workflow({ name: 'tool-layer', args: { action: 'map', category: '通信协议' } })
Workflow({ name: 'tool-layer', args: { action: 'map', task: 'I2C' } })
Workflow({ name: 'tool-layer', args: { action: 'install', source: 'git-url' } })
Workflow({ name: 'tool-layer', args: { action: 'remove', name: 'skill-name' } })
Workflow({ name: 'tool-layer', args: { action: 'update', name: 'skill-name' } })
Workflow({ name: 'tool-layer', args: { action: 'update', name: 'skill-name', confirm: true } })
Workflow({ name: 'tool-layer', args: { action: 'deps-tree' } })
Workflow({ name: 'tool-layer', args: { action: 'adopt', name: 'skill-name' } })
```

### Ops 层操作

```
Workflow({ name: 'ops-layer', args: { action: 'health' } })
Workflow({ name: 'ops-layer', args: { action: 'backup' } })
Workflow({ name: 'ops-layer', args: { action: 'restore', from: 'path/to/backup.tar.gz', dryRun: true } })
Workflow({ name: 'ops-layer', args: { action: 'package' } })
Workflow({ name: 'ops-layer', args: { action: 'deploy', target: 'user@host:/path' } })
Workflow({ name: 'ops-layer', args: { action: 'doctor' } })
Workflow({ name: 'ops-layer', args: { action: 'prune', days: 30 } })
```

## 环境

- **DeepSeek API 代理**: 自动通过 `session-start` hook 启动在 `localhost:17999`
- **所有 agent() 调用** 经过代理转发，剥离 `reasoning_effort` + `thinking:disabled` 参数

## 约束

- 5 步走完前不执行
- 不可逆操作等确认
- 「停」「不对」「换方向」立即中止
- 工具层操作（install/remove/update）经安全层 Phase 0.5 预检后方可执行
- Ops 层操作（restore/deploy/backup）涉及系统级写入，必须逐条确认

> 安全层已自动加载 AGENTS.md 规则体系。编排层任务执行前会经 Phase 0.5 安全预检（文件权限检查/高危操作识别/嵌入式专属约束），Phase 2.5 写入审计日志。违反规则的操作会被阻止或标记需确认。
