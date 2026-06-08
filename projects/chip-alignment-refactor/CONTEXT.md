# Agent System

> 五层 Agent 系统：需求对齐层、Agent 编排层、记忆层、安全层、运维层。工具层贯通所有层。

## Language

**Agent 编排层 (Agent Orchestration Layer)**:
接收需求对齐层输出的施工包，解析依赖图，分批派发 Agent 执行，通过三层门禁（AI 审查 → 用户验证 → 验收清单）管控质量。
_Avoid_: 调度层、执行层

**施工包 (Construction Package)**:
需求对齐层输出的完整交付物，包含 PRD + 4 项施工清单 + Issue 清单。

**依赖图 (Dependency Graph)**:
从施工名单中推导的任务依赖关系 DAG，决定任务的执行批次和并行策略。

**批次 (Batch)**:
依赖图中同一深度、无相互依赖的任务集合，同一批次内可并行执行。

**三层门禁 (Three-Layer Gate)**:
编排层的质量管控模型：① AI 自动审查 ② 用户验证 ③ 验收测试清单确认。

**需求对齐层 (Requirements Alignment Layer)**:
将模糊需求转化为结构化方案文档和清单的系统层。
_Avoid_: 需求层、QA 层

**Agent 编排层 (Agent Orchestration Layer)**:
接收需求层输出，分配工具和任务给各 Agent，用 tdd 等 skills 完成执行并汇总结果。
_Avoid_: 调度层、执行层

**记忆层 (Memory Layer)**:
跨层记忆系统，管理短期/近端/长期记忆，支持混合检索。
_Avoid_: 存储层、缓存层

**安全层 (Security Layer)**:
跨层权限控制、审计日志、异常检测。
_Avoid_: 防火墙层、认证层

**运维层 (Operations Layer)**:
跨层监控、维护、定期检查。
_Avoid_: DevOps 层、管理層

**工具层 (Tools Layer)**:
贯通所有层的 skills 仓库，提供可复用的工程能力（grill-me、tdd、diagnose 等）。
_Avoid_: 工具链、插件层

**施工清单 (Construction Checklist)**:
需求对齐层的标准输出，包含 4 项：现状确认表、代码约束清单、文件施工名单、验收测试清单。
_Avoid_: TODO 列表、任务清单
