// 需求对齐层 Workflow — 自动化预处理器
// 输入：模糊需求（自然语言）
// 输出：领域分析 + 4 张空清单模板 + 审查视角建议
//
// 设计原则：
// 1. 本 workflow 只做自动化可做的部分：领域检测、关键词提取、模板生成
// 2. 交互部分（grill-me / 约束梳理 / 多源审查 / 清单确认 / to-issues）
//    在 main conversation 中由主 agent 直接引导用户完成
// 3. Workflow 是后台任务，不能也不应该假装自己是交互式的
//
// 使用方式：
//   Workflow({ scriptPath: '.claude/workflows/requirements-alignment.js', args: { requirement: '...' } })
//   ⚠️ 推荐用 scriptPath 而非 name: 因 name: 使用编译缓存 → 不反映脚本实时编辑
//   → 得到分析结果 + 模板
//   → 主 agent 根据输出在对话中逐条引导用户确认

export const meta = {
  name: 'requirements-alignment',
  description: '需求对齐层（预处理）：领域检测 + 关键词提取 + 4 张空清单模板 + 审查视角建议。交互引导在 main conversation 中由主 agent 完成。',
  phases: [
    { title: 'Phase 0.5', detail: '语境检索 — 从记忆层获取相关历史经验' },
    { title: '初始分析', detail: 'agent 分析需求 + 记忆上下文 → 领域/关键词/模糊点/追问路径' },
    { title: '模板生成', detail: '生成 4 张空清单模板 + 审查视角推荐 + 默认约束' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const INITIAL_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    detected_domain: { type: 'string', description: '检测到的技术领域' },
    keywords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          term: { type: 'string' },
          category: { type: 'string', description: '技术/硬件/软件/协议/工具等分类' },
        },
        required: ['term', 'category'],
      },
    },
    possible_ambiguities: {
      type: 'array',
      items: { type: 'string' },
      description: '需求中潜在的模糊点，需要在 grill-me 中澄清',
    },
    grill_me_questions: {
      type: 'array',
      items: { type: 'string' },
      description: '建议主 agent 在对话中追问用户的问题清单',
    },
    suggested_perspectives: {
      type: 'array',
      items: { type: 'string' },
      description: '建议的多源审查视角（如 architecture, timing, debug 等）',
    },
    default_constraints: {
      type: 'array',
      items: { type: 'string' },
      description: '基于领域识别的默认技术约束，供对话中确认',
    },
    suggested_skills: {
      type: 'array',
      items: { type: 'string' },
      description: '建议在审查阶段调用的 domain skill 列表',
    },
  },
  required: ['detected_domain', 'keywords', 'possible_ambiguities', 'grill_me_questions'],
}

// ============================================================
// 实施
// ============================================================

if (!args.requirement) throw new Error('缺少 requirement 参数')

const requirement = args.requirement

log('╔══════════════════════════════════════════════════════╗')
log('║     需求对齐层 — 自动化预处理器                     ║')
log('╚══════════════════════════════════════════════════════╝')
log('')
log('收到需求: ' + requirement)
log('')
log('【模式说明】')
log('本 workflow 只做自动化预处理。')
log('交互引导（grill-me / 约束梳理 / 多源审查 / 清单确认）')
log('将由主 agent 在对话中直接完成。')
log('')

// ----------------------------------------------------------
// Phase 0.5: 语境检索 — 从记忆层获取相关历史经验
// ----------------------------------------------------------

phase('Phase 0.5: 语境检索 — 从记忆层获取相关经验')

log('从记忆层检索与需求相关的历史经验: "' + requirement.substring(0, 80) + '..."')

const memoryCtx = await workflow('memory-layer', {
  action: 'context',
  for: requirement,
})

const hasMemoryContext = memoryCtx?.source_count > 0 && memoryCtx?.context?.length > 0

if (hasMemoryContext) {
  log('✅ 从记忆层找到 ' + memoryCtx.source_count + ' 条相关记忆 (' + memoryCtx.context.length + ' 字符)')
  log('相关记忆将注入 Phase 1 分析，并作为六源审查的 KB 来源输出')
} else {
  log('ℹ️ 记忆层未找到与需求直接相关的历史条目')
}

log('')

// ----------------------------------------------------------
// Phase 1: 初始分析（含记忆层上下文）
// ----------------------------------------------------------

phase('Phase 1: 初始分析 — 领域检测 + 关键词提取 + 追问路径')

const memoryInjection = hasMemoryContext
  ? '\n\n=== 相关历史经验（从长期记忆中检索，用于辅助分析）===\n' +
    memoryCtx.context +
    '\n\n说明：以上是从过去项目经验中检索到的相关知识。\n' +
    '在分析时请利用这些经验来：\n' +
    '  - 识别潜在的技术风险（如已记录的踩坑经验）\n' +
    '  - 参考相似项目的技术选型\n' +
    '  - 避免重复已犯过的错误\n' +
    '  - 在 suggested_perspectives 中加入 knowledge 视角\n' +
    '  - 在 suggested_skills 中补充相关的记忆文件知识\n'
  : ''

const analysis = await agent(
  '你是一个嵌入式和通用软件的需求分析师。分析下面的模糊需求，输出结构化分析结果。\n\n' +
  '用户需求: "' + requirement + '"\n\n' +
  '任务：\n' +
  '1. 检测属于哪个技术领域（嵌入式/Web/后端/工具/库/其他）\n' +
  '2. 提取所有关键词，按类别标记（技术/硬件/软件/协议/工具/概念）\n' +
  '3. 识别需求中的模糊点，每个模糊点用一句话描述\n' +
  '4. 提出主 agent 在 grill-me 环节追问用户的问题清单（每个问题针对一个模糊点）\n' +
  '5. 建议多源审查视角（完整清单：architecture, implementation, timing, debug, communication, safety, quality, storage, wireless\n' +
  '   如记忆层有相关经验，额外加入 knowledge 视角做交叉验证）\n' +
  '6. 基于领域识别默认技术约束（语言/工具链/性能/兼容性/安全等）\n' +
  '7. 建议审查阶段调用的 domain skill（如 timer-module, i2c-bus 等 skill 名）\n' +
  '8. 如提供了相关历史经验，请引用其中的具体内容来丰富分析' +
  memoryInjection,
  { schema: INITIAL_ANALYSIS_SCHEMA }
)

if (!analysis) {
  throw new Error('初始分析失败，请重试')
}

const domain = analysis.detected_domain || '通用'
const keywords = analysis.keywords || []
const ambiguities = analysis.possible_ambiguities || []
const grillQuestions = analysis.grill_me_questions || []
const perspectives = analysis.suggested_perspectives || ['architecture', 'implementation', 'debug', 'quality']
const defaultConstraints = analysis.default_constraints || []
const suggestedSkills = analysis.suggested_skills || []

log('检测领域: ' + domain)
log('')
log('关键词 (' + keywords.length + ' 个):')
for (const kw of keywords) log('  ' + kw.term + ' (' + kw.category + ')')
log('')
log('模糊点 (' + ambiguities.length + ' 个):')
for (const amb of ambiguities) log('  ⚠️ ' + amb)
log('')
log('建议追问问题 (' + grillQuestions.length + ' 个):')
for (const q of grillQuestions) log('  ❓ ' + q)
log('')
log('建议审查视角: ' + perspectives.join(', '))
log('建议 domain skill: ' + suggestedSkills.join(', '))
log('')

// ----------------------------------------------------------
// Phase 2: 模板生成
// ----------------------------------------------------------

phase('Phase 2: 生成 4 张空清单模板')

log('生成 4 张施工清单模板...（全部标记为「待确认」）')
log('')

// 使用 agent 生成结构化的清单模板
const templateResult = await agent(
  '基于下面的需求分析，生成 4 张施工清单的模板。\n\n' +
  '原始需求: "' + requirement + '"\n' +
  '检测领域: ' + domain + '\n' +
  '关键词: ' + keywords.map(k => k.term).join(', ') + '\n' +
  '模糊点: ' + ambiguities.join('; ') + '\n' +
  '默认约束: ' + JSON.stringify(defaultConstraints) + '\n\n' +
  '生成 4 张表：\n\n' +
  '1. **现状确认表** (status)：[{ dimension, question, status: "待确认" }]\n' +
  '   dimension 包括: 项目目标、已有资产、依赖关系、风险点 等\n\n' +
  '2. **代码约束清单** (constraints)：[{ category, description, confirm_with: "用户" }]\n' +
  '   category 包括: 语言/工具链/性能/兼容性/安全/内存/其他\n' +
  '   从 default_constraints 中提取具体约束\n\n' +
  '3. **文件施工名单** (files)：[{ path, operation: "新增"|"修改"|"删除"|"移动", current, target }]\n' +
  '   根据关键词和领域，假设可能需要施工的文件\n\n' +
  '4. **验收测试清单** (acceptance)：[{ item, method, pass_criteria, judge: "用户判决" }]\n' +
  '   根据需求推断合理的验收项\n\n' +
  '所有条目必须标记为「待确认」。这是模板不是最终结论。',
  { schema: {
    type: 'object',
    properties: {
      status: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            dimension: { type: 'string' },
            question: { type: 'string' },
            status: { type: 'string', enum: ['待确认'] },
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
            confirm_with: { type: 'string' },
          },
          required: ['category', 'description', 'confirm_with'],
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
            judge: { type: 'string', enum: ['用户判决', '自动化'] },
          },
          required: ['item', 'method', 'pass_criteria', 'judge'],
        },
      },
    },
    required: ['status', 'constraints', 'files', 'acceptance'],
  }}
)

const templates = templateResult || {
  status: [
    { dimension: '项目目标', question: '要解决什么问题？', status: '待确认' },
    { dimension: '已有资产', question: '有哪些现有代码/文档/配置？', status: '待确认' },
    { dimension: '依赖关系', question: '依赖其他模块/系统/外部资源？', status: '待确认' },
    { dimension: '风险点', question: '哪些地方可能出问题？', status: '待确认' },
  ],
  constraints: defaultConstraints.length
    ? defaultConstraints.map(c => ({ category: '默认', description: c, confirm_with: '用户' }))
    : [{ category: '待补充', description: '约束需在对话中确认', confirm_with: '用户' }],
  files: [{ path: '待确认', operation: '新增', current: '待确认', target: '待确认' }],
  acceptance: [{ item: '功能正确性', method: '测试/用户验证', pass_criteria: '待确认', judge: '用户判决' }],
}

// ============================================================
// 交付
// ============================================================

phase('输出 — 预处理完成')

log('✅ 预处理完成，以下数据已返回。')
log('')
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
log('产出摘要:')
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
log('')
log('领域: ' + domain)
log('关键词: ' + keywords.length + ' 个')
log('模糊点: ' + ambiguities.length + ' 个')
log('追问项: ' + grillQuestions.length + ' 条')
log('审查视角: ' + perspectives.length + ' 个')
log('默认约束: ' + defaultConstraints.length + ' 条')
log('')
log('现状确认表: ' + templates.status.length + ' 项（待确认）')
log('代码约束清单: ' + templates.constraints.length + ' 项（待确认）')
log('文件施工名单: ' + templates.files.length + ' 项（待确认）')
log('验收测试清单: ' + templates.acceptance.length + ' 项（待确认）')
if (hasMemoryContext) {
  log('记忆层 KB: ' + memoryCtx.source_count + ' 条相关历史经验已注入')
}
log('')
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
log('交互流程将按以下步骤在对话中由主 agent 完成：')
log('')
log('  Step 1:   grill-me 锚定方向 — 主 agent 逐条追问你')
log('  Step 2:   grill-with-docs + to-prd 约束梳理')
log('  Step 2.5: 六源对齐审查（多源交叉验证）')
log('           ├─ Skills: 调 domain skill 验证技术细节')
log('           ├─ Web:    WebSearch 搜索最新资料')
log('           ├─ GitHub: 搜索参考实现')
if (hasMemoryContext) {
  log('           ├─ KB:     记忆层自动检索 — ' + memoryCtx.source_count + ' 条历史经验已注入')
} else {
  log('           ├─ KB:     记忆层未命中（无直接相关历史）')
}
log('           └─ 真伪:   可信度评级（参考手册 > 源码 > 社区）')
log('  Step 3:   逐条确认 4 张施工清单（结合 KB 经验建议）')
log('  Step 4:   to-issues 拆解 → 进入编排层')
log('')

const output = {
  mode: 'preprocess_only',
  status: 'ready',
  requirement,

  // 初始分析
  domain,
  keywords,
  ambiguities,
  grill_questions: grillQuestions,
  suggested_perspectives: perspectives,
  default_constraints: defaultConstraints,
  suggested_skills: suggestedSkills,

  // 4 张空清单模板
  checklist_templates: templates,

  // 记忆层检索结果（六源审查的 KB 来源）
  kb_context: hasMemoryContext
    ? {
        source: 'memory-layer',
        count: memoryCtx.source_count,
        context: memoryCtx.context,
      }
    : { source: 'memory-layer', count: 0, context: '' },

  // 验收清单（独立引用）
  acceptance: templates.acceptance.map(a => ({
    item: a.item,
    method: a.method,
    pass_criteria: a.pass_criteria,
    judge: a.judge,
    verdict: 'pending',
  })),

  // ============================================================
  // 链式触发元数据 — 引导主 agent 完成后续步骤
  // ============================================================
  chain: {
    status: 'preprocess_complete',   // 当前链路阶段
    total_steps: 4,                  // 总共 4 步会话 + 1 步编排
    flow: {
      // Step 1–4: 对话流程指引（由主 agent 在对话中执行）
      next_conversations: [
        {
          id: 'grill_me',
          step: 1,
          title: '锚定方向',
          description: '逐条追问确认需求方向',
          action: 'grill-me',
          data_scope: {
            inputs: ['grill_questions', 'ambiguities'],
            input_keys: {
              grill_questions: 'grill_questions',
              ambiguities: 'possible_ambiguities',
            },
            output_key: 'clarity_state',  // 主 agent 应在此键名存储结果
          },
        },
        {
          id: 'constraint_review',
          step: 2,
          title: '约束梳理',
          description: 'grill-with-docs + to-prd 确认 PRD 和技术约束',
          action: 'grill-with-docs',
          data_scope: {
            inputs: ['constraints_templates', 'suggested_skills'],
            output_key: 'confirmed_constraints',
          },
        },
        {
          id: 'six_source_review',
          step: 3,
          title: '六源对齐审查',
          description: '多源交叉验证（Skills/Web/GitHub/KB/真伪）',
          action: 'multi-source-review',
          data_scope: {
            inputs: ['suggested_perspectives', 'suggested_skills', 'kb_context'],
            output_key: 'verified_approaches',
          },
        },
        {
          id: 'checklist_confirm',
          step: 4,
          title: '清单确认',
          description: '逐条确认 4 张施工清单（现状/约束/文件/验收）',
          action: 'checklist-confirm',
          data_scope: {
            inputs: [
              'checklist_templates.status',
              'checklist_templates.constraints',
              'checklist_templates.files',
              'checklist_templates.acceptance',
            ],
            output_key: 'confirmed_checklists',
          },
        },
      ],

      // Step 5: 所有会话完成后 → 自动链路到编排层
      next_workflow: {
        name: 'agent-orchestration',
        when: 'after_checklist_confirmed',
        description: '需求对齐完成 → 进入编排层执行',
        args_forwarding: {
          // main agent 解析这些键名，从会话结果中提取数据传给编排层
          tasks: 'from confirmed_checklists → to-issues 拆解结果',
          acceptance: 'from confirmed_checklists.acceptance（用户已判决的验收项）',
          domain: 'domain（已自动检测）',
          session: `orchestration-session`,
        },
        example_call: [
          'Workflow({',
          "  name: 'agent-orchestration',",
          '  args: {',
          '    tasks: <to-issues 输出的任务列表>,',
          '    acceptance: <已确认的验收清单>,',
          '    domain: "<detected_domain>",',
          '    session: "orchestration-<date>",',
          '  }',
          '})',
        ].join('\n'),
      },

      // 异常链路：任何步骤失败 → 审计日志
      on_error: {
        name: 'safety-layer',
        description: '错误审计',
        args: { action: 'audit', entry: { type: 'alignment_error' } },
      },
    },
  },

  // ============================================================
  // AI 推理步骤清单 — 主 agent 按此逐条执行
  // ============================================================
  action_items: [
    {
      step: 1,
      action: 'skill',
      title: '锚定方向 — 追问澄清需求',
      skill: 'brainstorming',
      detail: '调用 brainstorming skill，按 grill_questions 逐条追问用户，澄清模糊点。每问完一条就总结确认，不要一次性抛所有问题。',
      reason: '模糊需求直接执行会导致方向错误，需先对齐理解',
      expects: '确认后的需求边界、硬件上下文、功能范围',
      output_key: 'clarity_state',
      depends_on: [],
    },
    {
      step: 2,
      action: 'skill',
      title: '约束梳理 — 确认 PRD 和技术约束',
      skill: 'grill-with-docs',
      detail: '调用 grill-with-docs 或直接在对话中确认约束清单中的每一项（语言/工具链/性能/兼容性/安全/内存等）。同时输出 to-prd 整理。',
      reason: '技术约束在开发阶段更改成本高，需尽早确认',
      expects: '确定的约束清单，排除不适用条目',
      output_key: 'confirmed_constraints',
      depends_on: ['step_1'],
    },
    {
      step: 3,
      action: 'multi',
      title: '六源对齐审查 — 多源交叉验证',
      skill: null,
      detail: '按 suggested_perspectives 逐源审查：\n' +
        '  1. Skills: 调每个 suggested_skills 验证技术细节\n' +
        '  2. Web: WebSearch 搜索最新资料/方案对比\n' +
        '  3. GitHub: 搜索参考实现\n' +
        '  4. KB: 已通过 memory-layer 自动检索（见 kb_context），也可手动 memory-layer search 补充\n' +
        '  5. 真伪验证: 可信度评级（参考手册 > 源码 > 社区）',
      reason: '多源交叉验证确保方案可行性，避免单一信源的盲区',
      expects: '已验证的方案对比和选型建议',
      output_key: 'verified_approaches',
      depends_on: ['step_2'],
    },
    {
      step: 4,
      action: 'conversation',
      title: '清单确认 — 逐条确认 4 张施工清单',
      skill: null,
      detail: '逐条向用户展示 4 张清单（现状/约束/文件/验收），逐条获取用户确认、修改或否决。每个变更立刻记入最终清单。',
      reason: '施工清单是编排层的输入，确认不全会导致执行中断',
      expects: '完整的已确认施工清单（status + constraints + files + acceptance）',
      output_key: 'confirmed_checklists',
      depends_on: ['step_3'],
    },
    {
      step: 5,
      action: 'workflow',
      title: '拆解执行 — to-issues → agent-orchestration',
      skill: null,
      detail: '将已确认的内容拆解为可执行的任务列表。每个任务包含：id, name, description, files, depends_on, techniques, acceptance。然后调用 agent-orchestration 传入任务列表和验收项。',
      reason: '结构化任务列表是编排层的标准输入格式',
      expects: 'agent-orchestration 输出的施工包（分批 + skill 推荐 + 预检结果）',
      output_key: 'orchestration_guide',
      depends_on: ['step_4'],
      next_workflow_args: {
        name: 'agent-orchestration',
        tasks: 'from to-issues output',
        acceptance: 'from confirmed_checklists.acceptance',
        domain: 'domain',
      },
    },
  ],

  // ============================================================
  // WorkflowState 共享状态 — 供链式调用自动装配参数
  // ============================================================
  state: {
    produced: {
      domain: domain,
      keywords: keywords,
      ambiguities: ambiguities,
      grill_questions: grillQuestions,
      suggested_perspectives: perspectives,
      default_constraints: defaultConstraints,
      suggested_skills: suggestedSkills,
      acceptance_templates: templates.acceptance,
      kb_context: hasMemoryContext ? memoryCtx.context : null,
      // 以下由主 agent 在对话中填充（经 action_items 指引）
      clarity_state: null,
      confirmed_constraints: null,
      verified_approaches: null,
      confirmed_checklists: null,
    },
    consumed_by: {
      'agent-orchestration': {
        tasks: '从 confirmed_checklists 经 to-issues 拆解产出',
        acceptance: '从 confirmed_checklists.acceptance 取已确认验收项',
        domain: 'produced.domain',
        session: '编排层会话 ID',
      },
      'memory-layer': {
        action: 'context',
        for: '原始需求描述 + 分析结果摘要',
      },
    },
  },
}

return output
