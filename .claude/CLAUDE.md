# Claude Code 全局配置

SOUL.md（Chip 人格）和 AGENTS.md（行为守则）由 session-start hook 自动注入。

**五层 Agent 系统已全局部署。** 任意目录下可直接调用 Workflow。

## 系统架构

```
需求对齐层 → 安全层 → 编排层 → 记忆层
                    工具层（技能管理）  Ops 层（系统运维）
```

## 日常使用

### 启动新需求

```javascript
// 1. 后台异步：记忆检索 + 领域预判 + 模板生成
Workflow({ name: 'requirements-alignment', args: { requirement: '<需求描述>' } })

// 2. 主 Agent 立即调 grill-me 开始交互式对话
```

### 专用 Agent

| Agent | 启动方式 |
|-------|---------|
| `embedded-expert` | `claude --agent embedded-expert` |
| `code-reviewer` | `claude --agent code-reviewer` |
| `test-runner` | `claude --agent test-runner` |
| `devops` | `claude --agent devops` |

### Workflow API 参考

详见 `~/.claude/reference/WORKFLOWS.md`

### 嵌入式专属约束

详见 `~/.claude/reference/EMBEDDED.md`

### 安全扫描 + 测试规范

详见 `~/.claude/reference/SECURITY.md`

## 环境

- **DeepSeek API 代理**: `localhost:17999`（session-start hook 自动启动）
- **设置**: `ANTHROPIC_BASE_URL=http://localhost:17999`

## 约束

- 5 步走完前不执行
- 不可逆操作等确认
- 「停」「不对」「换方向」立即中止
- 工具层操作经安全层 Phase 0.5 预检后方可执行
- Ops 层 restore/deploy 必须逐条确认
