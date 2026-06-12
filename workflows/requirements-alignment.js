// 需求对齐层 Workflow — 自动化预处理器
// 使用方式: Workflow({ name: 'requirements-alignment', args: { requirement: '...' } })

export const meta = {
  name: 'requirements-alignment',
  description: '需求对齐层（预处理）：领域检测+关键词提取+4张空清单模板+审查视角建议',
  phases: [
    { title: 'Phase 0.5', detail: '语境检索' },
    { title: '初始分析', detail: '领域/关键词/模糊点/追问路径' },
    { title: '模板生成', detail: '4 张空清单模板' },
  ],
}

const INITIAL_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    detected_domain: { type: 'string' },
    keywords: {
      type: 'array',
      items: { type: 'object', properties: { term: { type: 'string' }, category: { type: 'string' } }, required: ['term', 'category'] },
    },
    possible_ambiguities: { type: 'array', items: { type: 'string' } },
    grill_me_questions: { type: 'array', items: { type: 'string' } },
    suggested_perspectives: { type: 'array', items: { type: 'string' } },
    default_constraints: { type: 'array', items: { type: 'string' } },
    suggested_skills: { type: 'array', items: { type: 'string' } },
  },
  required: ['detected_domain', 'keywords', 'possible_ambiguities', 'grill_me_questions'],
}

if (!args.requirement) throw new Error('缺少 requirement 参数')
const requirement = args.requirement

log('收到需求: ' + requirement)
log('本 workflow 只做自动化预处理，交互引导在对话中由主 agent 完成')

// Phase 0.5: 语境检索
phase('Phase 0.5: 语境检索')
const memoryCtx = await workflow('memory-layer', { action: 'context', for: requirement })
const hasMemoryContext = memoryCtx?.source_count > 0 && memoryCtx?.context?.length > 0

// Phase 1: 初始分析
phase('Phase 1: 初始分析')
const memoryInjection = hasMemoryContext
  ? '\n\n=== 相关历史经验 ===\n' + memoryCtx.context + '\n'
  : ''

const analysis = await agent(
  '分析模糊需求，输出结构化结果。' +
  '检测领域/提取关键词/识别模糊点/提出追问问题/建议审查视角/建议默认约束/推荐domain skill。' +
  '需求: "' + requirement + '"\n\n' +
  memoryInjection,
  { schema: INITIAL_ANALYSIS_SCHEMA }
)

// Phase 2: 模板生成
phase('Phase 2: 模板生成')
const templates = await agent(
  '基于需求分析生成4张施工清单模板（全部标记待确认），包括: 现状确认表/代码约束/文件施工名单/验收测试',
  { schema: { type: 'object', properties: {
    status: { type: 'array', items: { type: 'object', properties: { dimension: { type: 'string' }, question: { type: 'string' }, status: { type: 'string', enum: ['待确认'] } }, required: ['dimension', 'question', 'status'] } },
    constraints: { type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, description: { type: 'string' }, confirm_with: { type: 'string' } }, required: ['category', 'description', 'confirm_with'] } },
    files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, operation: { type: 'string', enum: ['新增', '修改', '删除', '移动'] }, current: { type: 'string' }, target: { type: 'string' } }, required: ['path', 'operation', 'current', 'target'] } },
    acceptance: { type: 'array', items: { type: 'object', properties: { item: { type: 'string' }, method: { type: 'string' }, pass_criteria: { type: 'string' }, judge: { type: 'string', enum: ['用户判决', '自动化'] } }, required: ['item', 'method', 'pass_criteria', 'judge'] } },
  }, required: ['status', 'constraints', 'files', 'acceptance'] } }
)

return {
  mode: 'preprocess_only', status: 'ready', requirement,
  domain: analysis.detected_domain, keywords: analysis.keywords,
  ambiguities: analysis.possible_ambiguities,
  grill_questions: analysis.grill_me_questions,
  suggested_perspectives: analysis.suggested_perspectives,
  default_constraints: analysis.default_constraints,
  suggested_skills: analysis.suggested_skills,
  checklist_templates: templates,
  kb_context: hasMemoryContext ? { source: 'memory-layer', count: memoryCtx.source_count, context: memoryCtx.context } : { source: 'memory-layer', count: 0, context: '' },
  acceptance: (templates?.acceptance || []).map(a => ({ ...a, verdict: 'pending' })),
}
