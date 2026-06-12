# 安全规则 — 补充 AGENTS.md

## 密钥管理（KEY）
- 所有 API Key/Token 必须通过环境变量引用 `${VAR}`，禁止硬编码
- `.env` 文件必须加入 `.gitignore`
- 避免在 `settings.json` 的 `env` 字段中直接写入 secret 值
- 日志/缓存文件不应持久化密钥痕迹

## MCP Server 安全（MCP）
- 优先使用 stdio 传输；HTTP 传输必须使用 HTTPS
- 避免使用 `npx -y` 自动安装包——先手动安装再用 `node` 直接运行
- 检查 MCP server 的 `autoApprove` 设置，不应自动审批危险工具
- MCP args 中不应引用 `.env`、`.pem`、`credentials.json` 等凭据文件
- 绑定地址限制到 `127.0.0.1`，避免 `0.0.0.0`

## 权限配置（PERM）
- `permissions.allow` 使用最小权限原则，避免 `*` 全放开
- `defaultMode` 设为 `prompt` 而非 `auto`
- 启用 Workflow 时配合收紧的权限策略
- 项目级 settings 应覆盖全局权限而非继承全放开

## Hook 安全（HOOK）
- 所有 Hook 脚本必须通过安全审查（无 `rm -rf`、`curl|bash` 等高危命令）
- SessionStart hook 应设为 `async: true` 避免阻塞会话
- Hook timeout 不超过 300 秒
- 禁用/废弃的 hook 应及时从配置中清理
