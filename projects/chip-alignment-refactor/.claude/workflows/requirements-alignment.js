// 需求对齐层 Workflow（通用版）
// 输入：任何领域的模糊需求（自然语言）
// 输出：4 张施工清单 + PRD + Issue 清单 + 编排层 tasks
//
// 使用方式：
//   Workflow({ name: 'requirements-alignment', args: { requirement: '给 STM32F4 加 I²C 驱动' } })
//   Workflow({ name: 'requirements-alignment', args: { requirement: '重构用户认证模块，支持 OAuth2' } })
//   Workflow({ name: 'requirements-alignment', args: { requirement: '给博客加全文搜索' } })
//   → 输出可直接喂给编排层: Workflow({ name: 'agent-orchestration', args: { tasks: output.tasks, acceptance: output.checklists.acceptance } })

export const meta = {
  name: 'requirements-alignment',
  description: '需求对齐层：模糊需求 → 4 张施工清单 + PRD + Issue 清单 + 编排层 tasks（通用版，无领域绑定）',
  phases: [
    { title: '锚定方向', detail: 'agent 分析需求 → 消除歧义 → 提取关键词与领域' },
    { title: '约束梳理', detail: 'agent 约束分析 → 技术约束 + 术语映射 + ADR 推荐' },
    { title: '产出清单', detail: 'agent 生成 4 张施工清单（现状/约束/文件/验收）' },
    { title: '输出施工包', detail: 'agent 生成 PRD + Issues → 组装 tasks → 交付' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

// Step 1: 需求分析 Schema
const REQUIREMENT_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    aligned_description: { type: 'string', description: '对齐后的需求描述，消除歧义后的精确表述' },
    detected_domain: { type: 'string', description: '检测到的领域分类，如 Web 后端 / 嵌入式 / CLI 工具 / 数据处理' },
    keywords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string', description: '从需求中提取的关键技术词' },
          category: { type: 'string', description: '关键词所属分类，如 协议/框架/语言/模块' },
          relevance: { type: 'string', enum: ['high', 'medium', 'low'], description: '关键词对任务的重要性' },
        },
        required: ['term', 'category'],
      },
    },
    ambiguities: { type: 'array', items: { type: 'string' }, description: '需求中的模糊点和需要进一步确认的事项' },
    suggested_questions: { type: 'array', items: { type: 'string' }, description: '建议用户确认的问题列表' },
  },
  required: ['aligned_description', 'detected_domain', 'keywords', 'ambiguities'],
}

// Step 2: 约束分析 Schema
const CONSTRAINT_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    technical_constraints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '约束分类，如 语言/框架/协议/性能/兼容性' },
          description: { type: 'string', description: '具体的约束描述' },
          severity: { type: 'string', enum: ['hard', 'soft', 'info'], description: '约束强度：hard 不可违反，soft 建议遵循，info 仅供参考' },
        },
        required: ['category', 'description', 'severity'],
      },
    },
    terminology: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string', description: '建议收录的术语' },
          definition: { type: 'string', description: '术语的精确定义' },
          aliases: { type: 'array', items: { type: 'string' }, description: '应避免的同义词' },
        },
        required: ['term', 'definition'],
      },
    },
    adr_recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '建议的 ADR 标题' },
          reason: { type: 'string', description: '为什么需要 ADR（满足哪几条条件）' },
          alternatives: { type: 'array', items: { type: 'string' }, description: '需要权衡的备选方案' },
        },
        required: ['title', 'reason'],
      },
    },
    integration_checklist: {
      type: 'array',
      items: { type: 'string' },
      description: '约束层面需要验证的检查项列表',
    },
  },
  required: ['technical_constraints', 'terminology', 'adr_recommendations', 'integration_checklist'],
}

// Step 3: 施工清单 Schema
const CHECKLIST_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string' },
          question: { type: 'string' },
          status: { type: 'string', enum: ['待确认', '已确认'] },
        },
        required: ['dimension', 'question', 'status'],
      },
    },
    constraints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['category', 'description'],
      },
    },
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          operation: { type: 'string', enum: ['新增', '修改', '删除', '移动'] },
          current: { type: 'string' },
          target: { type: 'string' },
        },
        required: ['path', 'operation', 'current', 'target'],
      },
    },
    acceptance: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          method: { type: 'string' },
          pass_criteria: { type: 'string' },
          debug_steps: { type: 'string' },
        },
        required: ['item', 'method', 'pass_criteria', 'debug_steps'],
      },
    },
  },
  required: ['status', 'constraints', 'files', 'acceptance'],
}

// Step 4: PRD Schema
const PRD_SCHEMA = {
  type: 'object',
  properties: {
    problem_statement: { type: 'string' },
    solution: { type: 'string' },
    user_stories: { type: 'array', items: { type: 'string' } },
    implementation_decisions: { type: 'array', items: { type: 'string' } },
    out_of_scope: { type: 'array', items: { type: 'string' } },
  },
  required: ['problem_statement', 'solution', 'user_stories', 'implementation_decisions'],
}

// Step 4: Issue Schema
const ISSUE_SCHEMA = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          acceptance_criteria: { type: 'array', items: { type: 'string' } },
          blocked_by: { type: 'array', items: { type: 'string' } },
          techniques: { type: 'array', items: { type: 'string' }, description: '实现该 issue 可能需要的技术/方法/工具' },
        },
        required: ['id', 'title', 'description', 'acceptance_criteria'],
      },
    },
  },
  required: ['issues'],
}

// ============================================================
// 实施
// ============================================================

if (!args.requirement) throw new Error('缺少 requirement 参数。使用 args: { requirement: "你的需求描述" }')

const requirement = args.requirement
log(`收到模糊需求: "${requirement}"`)
log('')

// ----------------------------------------------------------
// Step 1: 锚定方向
// ----------------------------------------------------------

phase('Step 1: 锚定方向 — 需求分析 + 关键词提取')

const analysisResult = await agent(
  `你是一个需求分析师。分析下面的模糊需求，输出结构化分析。

用户需求: "${requirement}"

任务：
1. 精确描述这个需求（消除歧义，补全隐含信息）
2. 检测属于哪个领域分类（Web 后端 / 前端 / 嵌入式 / CLI 工具 / 数据处理 / 架构重构 / 其他）
3. 从需求中提取所有关键技术词，标注分类和重要性
4. 标记需求中的模糊点（缺少的关键信息、未明确的边界）
5. 提出建议用户确认的问题，帮助收窄范围`,
  { schema: REQUIREMENT_ANALYSIS_SCHEMA }
)

if (!analysisResult) {
  log('⚠️ 需求分析失败（agent 返回空），使用降级处理')
}

log(`检测领域: ${analysisResult?.detected_domain || '(未知)'}`)
if (analysisResult?.keywords) {
  log(`检测到 ${analysisResult.keywords.length} 个关键词:`)
  for (const kw of analysisResult.keywords) {
    log(`  - ${kw.term} (${kw.category}, ${kw.relevance})`)
  }
}
if (analysisResult?.ambiguities?.length) {
  log('模糊点:')
  for (const amb of analysisResult.ambiguities) log(`  ⚠️ ${amb}`)
}
log('')

// ----------------------------------------------------------
// Step 2: 约束梳理
// ----------------------------------------------------------

phase('Step 2: 约束梳理 — 技术约束 + 术语 + ADR')

const constraintResult = await agent(
  `你是一个项目约束分析师。基于需求分析结果，梳理技术约束和术语。

原始需求: "${requirement}"
对齐后需求: ${analysisResult?.aligned_description || requirement}
检测领域: ${analysisResult?.detected_domain || '未知'}
关键词: ${JSON.stringify(analysisResult?.keywords || [])}
模糊点: ${JSON.stringify(analysisResult?.ambiguities || [])}

任务：
1. 识别技术约束：语言/框架限制、性能要求、兼容性、安全要求、第三方依赖等
2. 为需求中出现的核心术语提供精确定义和避免使用的别名
3. 判断是否需要 ADR（标准：难以逆转 + 不读上下文会困惑 + 有真正权衡）
4. 列出约束层面需要验证的检查项`,
  { schema: CONSTRAINT_ANALYSIS_SCHEMA }
)

if (!constraintResult) {
  log('⚠️ 约束分析失败（agent 返回空），使用降级处理')
}

const constraints = constraintResult?.technical_constraints || []
if (constraints.length > 0) {
  log('技术约束:')
  for (const c of constraints) {
    const icon = c.severity === 'hard' ? '🔴' : c.severity === 'soft' ? '🟡' : 'ℹ️'
    log(`  ${icon} [${c.category}] ${c.description}`)
  }
}
const adrs = constraintResult?.adr_recommendations || []
if (adrs.length > 0) {
  log('ADR 推荐:')
  for (const a of adrs) log(`  📋 ${a.title}: ${a.reason}`)
}
log('')

// ----------------------------------------------------------
// Step 3: 产出 4 张施工清单
// ----------------------------------------------------------

phase('Step 3: 产出 4 张施工清单')

const checklists = await agent(
  `你是一个项目施工清单生成器。基于以下需求分析和约束分析，生成 4 张施工清单。

原始需求: "${requirement}"
对齐后需求: ${analysisResult?.aligned_description || requirement}
领域: ${analysisResult?.detected_domain || '未知'}
关键词: ${JSON.stringify(analysisResult?.keywords || [])}
技术约束: ${JSON.stringify(constraints || [])}
术语建议: ${JSON.stringify(constraintResult?.terminology || [])}

请生成以下 4 张表：

1. **现状确认表** (status)：检查项目目标、已有资产、依赖关系、风险点的确认状态
2. **代码约束清单** (constraints)：列出语言/框架版本、性能/资源、兼容性、安全、第三方依赖等约束。请结合需求领域给出有针对性的约束
3. **文件施工名单** (files)：列出所有需要新增/修改/删除/移动的文件，包含当前状态和目标状态的描述
4. **验收测试清单** (acceptance)：定义验收项、验收方法、验收标准和排查步骤

注意：所有 status 项初始为 "待确认" 状态。文件路径要合理，符合该领域常见项目结构。`,
  { schema: CHECKLIST_SCHEMA }
)

if (!checklists) {
  log('⚠️ 施工清单生成失败（agent 返回空），使用降级处理')
}

const safeChecklists = checklists || { status: [], constraints: [], files: [], acceptance: [] }
log(`施工清单已生成:`)
log(`  现状确认表: ${safeChecklists.status.length} 项`)
log(`  代码约束清单: ${safeChecklists.constraints.length} 项`)
log(`  文件施工名单: ${safeChecklists.files.length} 项`)
log(`  验收测试清单: ${safeChecklists.acceptance.length} 项`)
log('')

// ----------------------------------------------------------
// Step 4: 输出施工包（PRD + Issues 并行生成）
// ----------------------------------------------------------

phase('Step 4: 输出施工包 — PRD + Issue 清单')

log('并行生成 PRD 和 Issue 清单...')

const [prdResult, issuesResult] = await parallel([
  async () => {
    const result = await agent(
      `你是一个项目 PRD 作者。基于以下信息生成 PRD。

原始需求: "${requirement}"
对齐后需求: ${analysisResult?.aligned_description || requirement}
领域: ${analysisResult?.detected_domain || '未知'}
文件施工名单: ${JSON.stringify(safeChecklists.files)}
验收测试清单: ${JSON.stringify(safeChecklists.acceptance)}
技术约束: ${JSON.stringify(constraints)}

PRD 模板：
## Problem Statement
（要解决什么问题）

## Solution
（技术方案概述）

## User Stories
（用户故事列表）

## Implementation Decisions
（实现决策列表，每个决策给出理由）

## Out of Scope
（明确不在此次范围内的内容）`,
      { schema: PRD_SCHEMA }
    )
    return result
  },

  async () => {
    const result = await agent(
      `你是一个项目 Issue 拆分专家。基于以下信息生成垂直切片的 Issue 清单。

原始需求: "${requirement}"
对齐后需求: ${analysisResult?.aligned_description || requirement}
文件施工名单: ${JSON.stringify(safeChecklists.files)}
验收测试清单: ${JSON.stringify(safeChecklists.acceptance)}

每个 Issue 必须：
1. 是垂直切片（tracer bullet），贯穿所有集成层
2. 可独立验证
3. 写明依赖关系（blocked_by）
4. 标注需要的技术/方法/工具（techniques）

使用 ID 格式 I1, I2, I3...
依赖关系格式：{blocked_by: ["I1"]}`,
      { schema: ISSUE_SCHEMA }
    )
    return result
  },
])

if (!prdResult) log('⚠️ PRD 生成失败（agent 返回空）')
if (!issuesResult) log('⚠️ Issue 清单生成失败（agent 返回空）')

const prd = prdResult || { problem_statement: '', solution: '', user_stories: [], implementation_decisions: [], out_of_scope: [] }
const issues = issuesResult?.issues || []

// 从文件施工名单推导编排层 tasks（简单映射，无领域硬编码）
const tasks = safeChecklists.files.map((f, index) => {
  const id = `T${index + 1}`
  return {
    id,
    name: `${f.operation === '新增' ? '创建' : f.operation === '修改' ? '修改' : f.operation} ${f.path.split('/').pop()}`,
    description: `${f.operation} ${f.path}：${f.target}`,
    files: [f.path],
    depends_on: [],
    techniques: [],
  }
})

log(`从施工名单推导出 ${tasks.length} 个编排层任务`)
for (const t of tasks) {
  log(`  ${t.id}: ${t.name} (${t.files[0]})`)
}
log('')

// ============================================================
// 交付汇总
// ============================================================

phase('交付 — 施工包就绪')

const output = {
  // 原始输入
  requirement,

  // Step 1 产出
  refined_requirement: analysisResult?.aligned_description || requirement,
  analysis: analysisResult || { detected_domain: '未知', keywords: [], ambiguities: [] },

  // Step 2 产出
  constraints: constraintResult || { technical_constraints: [], terminology: [], adr_recommendations: [], integration_checklist: [] },

  // Step 3 产出
  checklists: safeChecklists,

  // Step 4 产出
  prd_markdown: prd,
  issues,

  // 编排层输入（可直接传递）
  tasks,
  acceptance: safeChecklists.acceptance,

  // 下一步
  next_step: '施工包已就绪。运行以下命令交给编排层执行：\n' +
    'Workflow({\n' +
    '  name: "agent-orchestration",\n' +
    `  args: { tasks: ${JSON.stringify(tasks)}, acceptance: ${JSON.stringify(safeChecklists.acceptance)} }\n` +
    '})',
}

log('')
log('=== 施工包交付摘要 ===')
log(`原始需求: "${requirement}"`)
log(`对齐后需求: ${output.refined_requirement}`)
log(`检测领域: ${analysisResult?.detected_domain || '未知'}`)
log(`检测关键词: ${(analysisResult?.keywords || []).length} 个`)
log(`技术约束: ${constraints.length} 项`)
log(`文件施工: ${safeChecklists.files.length} 项`)
log(`验收测试: ${safeChecklists.acceptance.length} 项`)
log(`PRD: ${prd.user_stories?.length || 0} 个用户故事`)
log(`Issues: ${issues.length} 个`)
log(`编排层 tasks: ${tasks.length} 个`)
log('')
log('✅ 施工包已就绪，可交付给 Agent 编排层')

return output
