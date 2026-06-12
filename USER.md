# User Guide

Chip 系统是通用的 Agent 增强系统。安装后，它通过以下方式增强你的 AI 编程助手：

1. **五层系统自动部署** — 安装后即可使用所有 Workflow
2. **更严谨的需求对齐** — 模糊需求自动被拆解追问，减少返工
3. **安全边界自动执行** — AGENTS.md 规则即代码，违规操作被标记
4. **跨会话持久记忆** — 不再丢失上下文
5. **技能生态管理** — 130+ 嵌入式/工程/生产力技能按需安装

## 首次使用

1. 完成安装（见 README.md 或 INSTALL.md）
2. 编辑 `~/.claude/settings.json`，设置 `ANTHROPIC_AUTH_TOKEN`
3. 启动 Claude Code
4. 运行 `Workflow({ name: 'ops-layer', args: { action: 'health' } })` 验证安装
