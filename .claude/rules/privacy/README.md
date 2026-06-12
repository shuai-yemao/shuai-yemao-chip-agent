# 数据隐私与脱敏规则

## 敏感数据处理
- 日志和调试输出中不应包含 API Key、Token、密码等敏感信息
- 用户消息历史（history.jsonl）仅用于 Homunculus 学习，不对外传输
- Transcript 文件、缓存不应持久化包含凭据的数据

## 记忆层
- 记忆文件（memory/*.md）不应直接存储密码或密钥
- 本能文件（homunculus/instincts/）记录行为模式，不存原始对话内容
- 定期审查记忆层数据，清理过期或不再相关的条目

## 备份与传输
- 备份文件不应包含明文凭据（settings.json 中的环境变量引用除外）
- 部署到远程机器时使用加密传输（SSH/SCP）
- 打包的分发包应排除 .env 文件和 secrets 文件

## 输出脱敏
- 向用户展示配置时，对 `ANTHROPIC_AUTH_TOKEN` 等敏感值做截断显示（sk-an...XYZ）
- 日志中敏感路径使用相对路径替代绝对路径
