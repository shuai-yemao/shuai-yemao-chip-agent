# 安全扫描 + 持续学习 + 测试规范

> 本文件按需加载，不注入上下文。

## AgentShield 安全扫描器

扫描 `~/.claude/` 下配置文件，检测密钥泄露、MCP 风险、权限过宽、Hook 安全、Agent 配置漂移。

**评分体系**: 满分 100，按 severity 扣分（critical:25, high:15, medium:10, low:5）。等级 A(>=90) / B(>=70) / C(>=50) / D(>=30) / F。

**规则覆盖**（102 条，8 分类）:

| 分类 | 规则数 | 覆盖内容 |
|------|:------:|----------|
| KEY | 20 | Anthropic/OpenAI/AWS/GitHub 密钥、JWT、数据库连接串、私钥引用 |
| MCP | 25 | HTTP 明文、npx -y 自动安装、凭据文件引用、autoApprove、0.0.0.0 绑定 |
| PERM | 15 | allow(*) 通配、Bash(*) 全放开、defaultMode auto、Workflow 组合风险 |
| HOOK | 15 | 危险命令、阻塞模式、超时过长、路径错误、残留禁用 hook |
| AGENT | 12 | 工具权限过多、模型过强、缺少约束/作用域、重复定义 |
| NET | 5 | 网络访问限制 |
| DATA | 5 | 数据处理规则 |
| OPS | 5 | 运维操作规则 |

## Homunculus 持续学习

从会话历史（`history.jsonl`）自动提取工具调用模式，分析后生成"本能"（instincts）。

**本能演进**: 置信度 0.3（1-2 次）→ 0.5（3-5 次）→ 0.7（6-10 次）→ 0.85（11+ 次）

- `confidence >= 0.7` 时自动桥接到记忆层（`memory-layer save`）
- 本能文件存储于 `~/.claude/homunculus/instincts/personal/{slug}.md`

**架构**:
- `bin/homunculus-hook.js` — PostCompact hook：增量读取 history.jsonl
- `workflows/homunculus-observer.js` — 分析引擎：子 agent 识别重复模式
- `homunculus/homunculus-config.yml` — 配置：置信度演进、冷却时间、桥接阈值

## 测试规范

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

```bash
# 全部测试
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js

# 单个测试
node ~/.claude/workflows/__tests__/run-all-workflow-tests.js --file safety-layer.test.js

# 独立 runner
node ~/.claude/workflows/__tests__/run-homunculus-test.js
node ~/.claude/workflows/__tests__/run-agentshield-test.js
```
