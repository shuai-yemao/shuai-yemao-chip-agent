// Ops 层 Workflow — 系统运维 + 打包分发
// 使用方式: Workflow({ name: 'ops-layer', args: { action: 'health' } })

export const meta = {
  name: 'ops-layer',
  description: 'Ops 层：系统运维 — 健康检查/备份恢复/打包部署/诊断/清理',
  phases: [{ title: '解析' }, { title: '扫描' }, { title: '执行' }, { title: '输出' }],
}

const CLAUDE_DIR = '~/.claude'; const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const { action } = args

// Health
if (action === 'health') {
  const result = await agent('对 ' + CLAUDE_DIR + ' 执行系统健康检查', { schema: { type: 'object', properties: { status: { type: 'string', enum: ['ok', 'warning', 'error'] }, checks: { type: 'object' }, summary: { type: 'string' } }, required: ['status', 'checks', 'summary'] } })
  return result
}

// Backup
if (action === 'backup') {
  return await agent('生成 ' + CLAUDE_DIR + ' 的备份', { schema: { type: 'object', properties: { success: { type: 'boolean' }, path: { type: 'string' }, size_bytes: { type: 'number' }, items_count: { type: 'number' } }, required: ['success'] } })
}

// Restore
if (action === 'restore') {
  if (!args.from) throw new Error('restore 需要 from 参数')
  if (args.dryRun) { return { success: true, dry_run: true, preview: '预览恢复操作（dry-run）' } }
  return await agent('从 ' + args.from + ' 恢复到 ' + CLAUDE_DIR)
}

// Package
if (action === 'package') {
  return await agent('生成可移植分发包', { schema: { type: 'object', properties: { success: { type: 'boolean' }, path: { type: 'string' }, size_bytes: { type: 'number' }, setup_script: { type: 'string' } }, required: ['success'] } })
}

// Deploy
if (action === 'deploy') {
  if (!args.target) throw new Error('deploy 需要 target 参数')
  return await agent('部署到 ' + args.target)
}

// Doctor
if (action === 'doctor') {
  return await agent('对 ' + CLAUDE_DIR + ' 执行诊断', { schema: { type: 'object', properties: { issues_found: { type: 'number' }, issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, category: { type: 'string' }, message: { type: 'string' }, fixable: { type: 'boolean' }, auto_fixed: { type: 'boolean' } } } }, summary: { type: 'string' } }, required: ['issues_found', 'issues', 'summary'] } })
}

// Prune
if (action === 'prune') {
  return await agent('清理 ' + CLAUDE_DIR + ' 下过期数据（保留 ' + (args.days || 30) + ' 天）', { schema: { type: 'object', properties: { success: { type: 'boolean' }, freed_bytes: { type: 'number' }, removed: { type: 'array', items: { type: 'string' } } }, required: ['success'] } })
}

throw new Error('Unknown action: "' + action + '". Supported: health, backup, restore, package, deploy, doctor, prune.')
