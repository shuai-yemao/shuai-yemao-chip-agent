# Workflow API 参考

> 本文件按需加载，不注入上下文。

## 操作示例

### 需求对齐层

```
Workflow({ name: 'requirements-alignment', args: { requirement: '<需求描述>' } })
```

### 编排层

```
Workflow({
  name: 'agent-orchestration',
  args: {
    tasks:      <to-issues 拆解结果>,
    acceptance: <已确认验收项>,
    domain:     <自动检测领域>,
  }
})
```

### 记忆层

```
Workflow({ name: 'memory-layer', args: { action: 'search', query: 'I2C' } })
Workflow({ name: 'memory-layer', args: { action: 'context', for: '当前任务' } })
```

### 安全层

```
Workflow({ name: 'safety-layer', args: { action: 'preflight', task: { name: '操作', files: ['.env'], command: '' }, domain: 'embedded' } })
Workflow({ name: 'safety-layer', args: { action: 'check_permission', path: '.env', operation: 'read' } })
Workflow({ name: 'safety-layer', args: { action: 'filter', text: '含敏感信息的文本' } })
Workflow({ name: 'safety-layer', args: { action: 'audit', entry: { type: '高危操作', path: '...' }, session: '当前会话' } })
Workflow({ name: 'safety-layer', args: { action: 'anomaly_check', log: [...], session: '当前会话' } })
Workflow({ name: 'safety-layer', args: { action: 'inject_rules', domain: 'embedded' } })
```

### 工具层

```
Workflow({ name: 'tool-layer', args: { action: 'list' } })
Workflow({ name: 'tool-layer', args: { action: 'map' } })
Workflow({ name: 'tool-layer', args: { action: 'map', category: '通信协议' } })
Workflow({ name: 'tool-layer', args: { action: 'map', task: 'I2C' } })
Workflow({ name: 'tool-layer', args: { action: 'version' } })
Workflow({ name: 'tool-layer', args: { action: 'check' } })
Workflow({ name: 'tool-layer', args: { action: 'install', source: 'git-url' } })
Workflow({ name: 'tool-layer', args: { action: 'remove', name: 'skill-name' } })
Workflow({ name: 'tool-layer', args: { action: 'remove', name: 'skill-name', force: true } })
Workflow({ name: 'tool-layer', args: { action: 'update', name: 'skill-name' } })
Workflow({ name: 'tool-layer', args: { action: 'update', name: 'skill-name', confirm: true } })
Workflow({ name: 'tool-layer', args: { action: 'deps-tree' } })
Workflow({ name: 'tool-layer', args: { action: 'adopt', name: 'skill-name' } })
```

### Ops 层

```
Workflow({ name: 'ops-layer', args: { action: 'version' } })
Workflow({ name: 'ops-layer', args: { action: 'health' } })
Workflow({ name: 'ops-layer', args: { action: 'backup' } })
Workflow({ name: 'ops-layer', args: { action: 'restore', from: 'path/to/backup.tar.gz', dryRun: true } })
Workflow({ name: 'ops-layer', args: { action: 'restore', from: 'path/to/backup.tar.gz' } })
Workflow({ name: 'ops-layer', args: { action: 'package' } })
Workflow({ name: 'ops-layer', args: { action: 'deploy', target: 'user@host:/path' } })
Workflow({ name: 'ops-layer', args: { action: 'doctor' } })
Workflow({ name: 'ops-layer', args: { action: 'prune' } })
Workflow({ name: 'ops-layer', args: { action: 'prune', days: 7 } })
```

### Homunculus

```
Workflow({ name: 'homunculus-observer', args: { action: 'status' } })
Workflow({ name: 'homunculus-observer', args: { action: 'capture' } })
Workflow({ name: 'homunculus-observer', args: { action: 'analyze' } })
```

### AgentShield

```
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'all' } })
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'keys' } })
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'mcp' } })
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'permissions' } })
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'hooks' } })
Workflow({ name: 'agentshield-scanner', args: { action: 'scan', scope: 'agents' } })
```

## 测试

```bash
# 全部测试（217 项）
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js

# 单个测试文件
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js --file safety-layer.test.js

# 独立运行
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js
node ~/.claude/workflows/__tests__/run-homunculus-test.js
node ~/.claude/workflows/__tests__/run-agentshield-test.js
```

| 模块 | 测试文件 | 通过数 |
|------|---------|:------:|
| safety-layer | safety-layer.test.js | 48 |
| agent-orchestration | orchestration-security.test.js | 19 |
| embedded domain | embedded-security.test.js | 22 |
| homunculus-observer | homunculus-observer.test.js | 15 |
| agentshield-scanner | agentshield-scanner.test.js | 20 |
| integration | integration-homunculus-agentshield.test.js | 22 |
| tool-layer | tool-layer.test.js | 23 |
| **总计** | | **217** |
