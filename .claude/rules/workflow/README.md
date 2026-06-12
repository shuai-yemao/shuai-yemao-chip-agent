# Workflow 编写与安全规则

## Workflow 设计原则
- 每个 Workflow 必须包含 `meta` 块（name, description, phases）
- 使用 `phase()` 分阶段组织，每阶段有明确标题
- 优先用 `pipeline()` 而非 `parallel()`——除非确实需要跨项聚合
- 子 agent 的 prompt 要明确指定输出格式，优先使用 `schema` 约束

## 安全集成
- 所有文件操作必须通过子 agent 工具完成（不直接使用 fs/process）
- 修改文件前应使用 `log()` 输出变更预览
- 不可逆操作（删除、覆盖）需先确认
- Workflow 不应硬编码密钥或凭据

## 错误处理
- 子 agent 可能返回 `null`——使用 `?.` 和 `||` 安全解包
- schema 验证失败时子 agent 自动重试
- 主流程使用 try/catch 捕获 agent 错误

## 性能
- 子 agent 的 prompt 保持简洁聚焦，避免超长指令
- 优先复用已有技能而非从零构建
- 定期检查 workflow 脚本是否有语法错误
