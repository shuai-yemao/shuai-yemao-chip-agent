# 实现需求对齐层 (Requirements Alignment Layer)

## Context

需求对齐层是五层 Agent 系统的第一层，负责将模糊需求转化为结构化施工包（PRD + 4 张施工清单 + Issue 清单），交付给 Agent 编排层执行。

当前状态：
- 设计文档完整：`docs/agent-system/requirements-alignment/README.md`（4 步流程、决策树、嵌入式专项处理、质量门禁）
- 术语记录完整：`CONTEXT.md`、`UBIQUITOUS_LANGUAGE.md`
- 映射表完整：`SKILL_REGISTRY.md`（10 大类 30+ 关键词条目）
- Workflow 脚本是**骨架**（`.claude/workflows/requirements-alignment.js`）：只有 log 占位，没有实际的 `agent()` 调用
- 编排层（agent-orchestration.js）已有完整的 `agent()` 派发、Schema 验证、错误处理模式可供参考

## 目标

将 `requirements-alignment.js` 从骨架重写为**可运行的 Workflow**，输入模糊需求，输出可直接喂给编排层的施工包。

## 复用模式（来自编排层）

- `agent(prompt, {schema})` — 带 Schema 验证的 subagent 派发
- `phase(title)` — 阶段分组
- `parallel(thunks)` — 并行任务（Step 4 的 to-prd + to-issues 可并行）
- `log(msg)` — 进度输出
- Schema 定义 + `agent()` 返回 null 时的容错处理

## 设计

### 输入输出契约

```
输入: { requirement: string }    // 用户模糊需求文本
输出: {
  requirement: string,             // 原始需求
  refined_requirement: string,     // 对齐后需求描述
  analysis: {                      // Step 1 产出（关键词、技能映射、模糊点）
    detected_domain: string,
    keywords: [{ term, matched_skill }],
    ambiguities: string[],
    aligned_description: string
  },
  constraints: {                   // Step 2 产出
    technical: [{ category, description }],
    terminological: [{ term, definition }],
    adr_needed: string[]
  },
  checklists: {                    // Step 3 产出（4 张表）
    status: [{ dimension, question, status }],
    constraints: [{ category, description }],
    files: [{ path, operation, current, target }],
    acceptance: [{ item, method, pass_criteria, debug_steps }]
  },
  prd: string,                     // Step 4 产出（Markdown）
  issues: [{ title, description, acceptance_criteria, blocked_by }],
  tasks: [{ id, name, description, files, depends_on, skills_needed }],  // 编排层输入
  next_step: string                // 提示用户下一步交给编排层
}
```

### Step 1: 锚定方向（锚定方向）

**输入**: `args.requirement`
**操作**:
1. 读取 SKILL_REGISTRY.md 内容（硬编码或文件引用）
2. 用 `agent()` 分析需求文本，检测嵌入式关键词
3. 按关键词在 SKILL_REGISTRY.md 中匹配对应 skill
4. 标记模糊点、缺失信息
5. 输出结构化需求分析

**Schema**: `REQUIREMENT_ANALYSIS_SCHEMA`
```javascript
{
  type: 'object',
  properties: {
    aligned_description: { type: 'string' },
    detected_domain: { type: 'string' },
    keywords: { type: 'array', items: { type: 'object', properties: { term, matched_skill } } },
    ambiguities: { type: 'array', items: { type: 'string' } },
    suggested_questions: { type: 'array', items: { type: 'string' } },
  }
}
```

### Step 2: 约束梳理（约束梳理）

**输入**: Step 1 的分析结果 + `args.requirement`
**操作**:
1. 用 `agent()` 对照需求分析，检查 CONTEXT.md 中的现有术语
2. 识别技术约束（芯片、引脚、外设、速率、资源限制）
3. 判断是否需要 ADR（满足难以逆转 + 不读上下文会困惑 + 有真正权衡 三条件）
4. 输出约束分析和术语建议

**Schema**: `CONSTRAINT_ANALYSIS_SCHEMA`
```javascript
{
  type: 'object',
  properties: {
    technical_constraints: { type: 'array', items: { type: 'object', properties: { category, description } } },
    terminology: { type: 'array', items: { type: 'object', properties: { term, definition } } },
    adr_recommendations: { type: 'array', items: { type: 'object', properties: { title, reason } } },
  }
}
```

### Step 3: 产出 4 张施工清单（产出清单）

**输入**: Step 1 + Step 2 结果合并
**操作**:
1. 用 `agent()` 调用 `CHECKLIST_SCHEMA`（已在骨架中定义，复用）
2. 自动生成 4 张表：
   - 现状确认 status（项目目标、已有资产、依赖关系、风险点）
   - 代码约束 constraints（语言版本、性能资源、兼容性、安全、第三方依赖）
   - 文件施工 files（路径、操作类型、当前状态、目标状态）
   - 验收测试 acceptance（验收项、方法、通过标准、排查步骤）

**Schema**: `CHECKLIST_SCHEMA`（已有, 直接复用）

### Step 4: 输出施工包（输出施工包）

**输入**: 4 张清单
**操作**:
1. 用 `agent()` 基于清单生成 PRD（Problem Statement → Solution → User Stories → Implementation Decisions）
2. 用 `agent()` 基于清单生成 Issue 清单（垂直切片 tracer bullet）
3. 将 4 张清单中的 `files` + `acceptance` 推导为编排层的 `tasks` 输入
4. 两个 agent 调用可并行（`parallel()`）
5. 组装完整施工包

**Step 4 关键**: 从文件施工名单和验收测试推导出编排层的 `tasks` 数组：
- 每个文件施工项 → 对应一个或多个 task
- task.depends_on → 按文件间逻辑依赖推导
- task.skills_needed → 按 Step 1 匹配的 skill 映射

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|:----:|------|
| `.claude/workflows/requirements-alignment.js` | **重写** | 骨架 → 完整实现，4 步全用 `agent()` 调用 |
| `docs/agent-system/requirements-alignment/README.md` | 不修改 | 设计已完整，实现与设计对齐即可 |

## 不需修改的其他文件

- `CONTEXT.md` — 施工包产出的术语由用户确认后手动更新
- `UBIQUITOUS_LANGUAGE.md` — 同上
- `SKILL_REGISTRY.md` — 只读参考
- `.claude/workflows/agent-orchestration.js` — 接口不变，需求层输出直接输入编排层

## 验证方案

用以下命令运行完整链路：

```
Workflow({ scriptPath: '.claude/workflows/requirements-alignment.js', args: { requirement: '给 STM32F4 加 I²C 驱动，挂 2 个传感器，400kHz' } })
```

预期输出：
1. Step 1 成功 → 输出关键词分析
2. Step 2 成功 → 输出约束清单
3. Step 3 成功 → 输出 4 张施工清单（符合 CHECKLIST_SCHEMA）
4. Step 4 成功 → 输出完整施工包

将输出的 `tasks` 和 `acceptance` 直接喂给编排层验证链路完整性：

```
Workflow({ scriptPath: '.claude/workflows/agent-orchestration.js', args: { tasks: <上一步输出的tasks>, acceptance: <上一步输出的checklists.acceptance> } })
```

## 实施顺序

1. 在骨架文件顶部添加 Step 1-4 的 Schema 定义（REQUIREMENT_ANALYSIS_SCHEMA、CONSTRAINT_ANALYSIS_SCHEMA）
2. 实现 Step 1: agent() 分析需求 → 匹配 SKILL_REGISTRY → 输出结构化分析
3. 实现 Step 2: agent() 约束梳理 → 技术约束 + 术语建议 + ADR 推荐
4. 实现 Step 3: agent() + CHECKLIST_SCHEMA → 4 张施工清单
5. 实现 Step 4: agent() PRD + agent() Issues → parallel 并行 → 组装 tasks
6. 运行验证命令确认全链路
