# Agent System

> 五层 Agent 系统：需求对齐层、Agent 编排层、记忆层、安全层、运维层。工具层贯通所有层。

## Language

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
