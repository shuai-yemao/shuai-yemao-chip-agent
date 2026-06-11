// 工具层 Workflow — 技能包管理器
// 使用方式: Workflow({ name: 'tool-layer', args: { action: 'list' } })

export const meta = {
  name: 'tool-layer',
  description: '工具层：技能包管理器 — 安装/卸载/更新/列表/依赖管理',
  phases: [{ title: '解析' }, { title: '扫描' }, { title: '执行' }, { title: '输出' }],
}

const SKILLS_DIR = '~/.claude/skills'
const REGISTRY_PATH = '~/.claude/tool-layer/registry.json'
const { action } = args

// List
if (action === 'list') {
  const skills = await agent('扫描 ' + SKILLS_DIR + ' 下所有 SKILL.md，返回结构化列表', { schema: { type: 'object', properties: { total: { type: 'number' }, skills: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' }, status: { type: 'string' } } } } } } })
  return skills
}

// Install
if (action === 'install') {
  if (!args.source) throw new Error('install 需要 source 参数')
  return await agent('安装技能 ' + args.source + ' 到 ' + SKILLS_DIR, { schema: { type: 'object', properties: { success: { type: 'boolean' }, name: { type: 'string' }, version: { type: 'string' }, error: { type: 'string' } }, required: ['success', 'name'] } })
}

// Remove
if (action === 'remove') {
  if (!args.name) throw new Error('remove 需要 name 参数')
  return await agent('卸载技能 ' + args.name, { schema: { type: 'object', properties: { success: { type: 'boolean' }, name: { type: 'string' }, has_dependents: { type: 'boolean' }, error: { type: 'string' } }, required: ['success', 'name'] } })
}

// Update
if (action === 'update') {
  if (!args.name) throw new Error('update 需要 name 参数')
  return await agent('更新技能 ' + args.name + (args.confirm ? ' (已确认)' : ' (预览模式)'), { schema: { type: 'object', properties: { success: { type: 'boolean' }, name: { type: 'string' }, version: { type: 'string' }, error: { type: 'string' } }, required: ['success', 'name'] } })
}

// Deps-tree
if (action === 'deps-tree') {
  return await agent('分析 ' + SKILLS_DIR + ' 下所有 SKILL.md 的 depends_on 依赖关系')
}

// Adopt
if (action === 'adopt') {
  if (!args.name) throw new Error('adopt 需要 name 参数')
  return await agent('收养现有技能 ' + args.name, { schema: { type: 'object', properties: { success: { type: 'boolean' }, name: { type: 'string' }, version: { type: 'string' }, error: { type: 'string' } }, required: ['success', 'name'] } })
}

throw new Error('Unknown action: "' + action + '". Supported: list, install, remove, update, deps-tree, adopt.')
