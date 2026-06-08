// 需求对齐层 Workflow
// 输入：模糊需求（自然语言 + 嵌入式术语）
// 输出：4 张施工清单 + PRD + Issue 清单
//
// 使用方式：Workflow({ scriptPath: '.claude/workflows/requirements-alignment.js', args: { requirement: '...' } })

export const meta = {
  name: 'requirements-alignment',
  description: '需求对齐层：模糊需求 → 4 张施工清单 + PRD + Issue 清单',
  phases: [
    { title: '锚定方向', detail: 'grill-me 追问需求，走遍决策树' },
    { title: '约束梳理', detail: 'grill-with-docs + 术语精炼' },
    { title: '产出清单', detail: '4 张施工清单' },
    { title: '输出施工包', detail: 'PRD + Issue 清单' },
  ],
}

// Schema：施工清单 4 项
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

const SKILL_REGISTRY = 'SKILL_REGISTRY.md'

phase('Step 1: 锚定方向')
log(`需求: ${args.requirement || '(未提供，等待用户输入)'}`)
log('→ 调 grill-me 逐层追问，走遍决策树')
log('→ 检测嵌入式关键词，匹配 SKILL_REGISTRY.md 中的映射')
log('→ 输出：对齐后的需求描述')

// 注意：grill-me 是交互式过程，需要与用户对话
// 此 workflow 在完成交互后进入下一步

phase('Step 2: 约束梳理')
log('→ 调 grill-with-docs 对照领域模型挑战方案')
log('→ 调 ubiquitous-language 精炼术语')
log('→ 输出：CONTEXT.md + UBIQUITOUS_LANGUAGE.md + ADR')

phase('Step 3: 产出 4 张施工清单')
log('→ 生成 4 张表：现状确认/代码约束/文件施工/验收测试')

phase('Step 4: 输出施工包')
log('→ 调 to-prd 生成 PRD')
log('→ 调 to-issues 生成 Issue 清单')
log('→ 输出：施工包（PRD + 4 表 + Issues）')

return {
  status: 'design_complete',
  output: '施工包已就绪，可交付给 Agent 编排层',
  references: [
    'CONTEXT.md',
    'UBIQUITOUS_LANGUAGE.md',
    'SKILL_REGISTRY.md',
    'docs/agent-system/requirements-alignment/README.md',
  ],
}
