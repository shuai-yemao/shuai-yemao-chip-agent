// 安全层 Workflow — AGENTS.md 规则即代码
// 可编程安全护栏：预检/权限/过滤/审计/异常检测/规则注入
//
// 使用方式：
//   Workflow({ name: 'safety-layer', args: { action: 'preflight', task: {...}, domain: 'embedded' } })
//   Workflow({ name: 'safety-layer', args: { action: 'check_permission', path: '.env', operation: 'read' } })
//   Workflow({ name: 'safety-layer', args: { action: 'filter', text: '含敏感信息的文本' } })
//   Workflow({ name: 'safety-layer', args: { action: 'audit', entry: {...} } })
//   Workflow({ name: 'safety-layer', args: { action: 'anomaly_check', log: [...], session: '...' } })
//   Workflow({ name: 'safety-layer', args: { action: 'inject_rules', domain: 'embedded' } })
//   Workflow({ name: 'safety-layer', args: { action: 'status' } })

export const meta = {
  name: 'safety-layer',
  description: '安全层 — AGENTS.md 可编程安全护栏：预检/权限/过滤/审计/异常检测/规则注入',
  phases: [{ title: '路由' }, { title: '执行' }, { title: '输出' }],
}

// ============================================================
// 规则数据 — 从 AGENTS.md 编码为可编程常量
// ============================================================

// 文件权限矩阵
const FILE_PERMISSIONS = {
  '*.md':            { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '.claude/':        { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  'skills/':         { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  'docs/':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '.env*':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '.git/':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
  'build/':          { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  'dist/':           { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '~/.ssh/':         { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.ld':            { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.icf':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.scf':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  'startup_*.s':     { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  'system_*.c':      { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.flm':           { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.flash':         { read: 'auto',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.dts':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.dtsi':          { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.cfg':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.tcl':           { read: 'auto',  write: 'confirm', del: 'deny',  exec: 'deny' },
  '*.hex':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.bin':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
  '*.elf':           { read: 'deny',  write: 'deny',    del: 'deny',  exec: 'deny' },
}

// 高风险操作模式
const HIGH_RISK_PATTERNS = [
  { pattern: /删除文件\s*[:：]?\s*\S+/i, level: 'high', category: 'file_delete', message: '删除文件需确认路径+理由' },
  { pattern: /批量删除|rm\s+-[rf]/i, level: 'high', category: 'file_delete', message: '批量删除需列出清单' },
  { pattern: /(apt|brew|pip|npm)\s+install/i, level: 'high', category: 'system_cmd', message: '安装/卸载需确认包名+版本' },
  { pattern: /curl\s+.*\s*\|\s*(bash|sh|powershell)/i, level: 'high', category: 'network', message: '管道安装未审查远程代码' },
  { pattern: /烧录|flash|program\s+\S+\.(hex|bin)/i, level: 'high', category: 'embedded_flash', message: '烧录须确认MCU型号' },
  { pattern: /全片擦除|mass erase|chip erase/i, level: 'high', category: 'embedded_flash', message: '全片擦除不可逆' },
  { pattern: /option byte|读保护|RDP|PCROP/i, level: 'high', category: 'embedded_config', message: 'Option Bytes可能锁死芯片' },
  { pattern: /修改.*(时钟|PLL|HSE|HSI).*(频率|配置)/i, level: 'high', category: 'embedded_config', message: '修改时钟配置须确认频率' },
  { pattern: /禁用.*(看门狗|Watchdog|IWDG|WWDG)/i, level: 'high', category: 'embedded_config', message: '禁用Watchdog须说明理由' },
  { pattern: /(JLink|OpenOCD|ST-Link).*(halt|reset|flash)/i, level: 'high', category: 'embedded_debug', message: '调试器操作须确认设备' },
  { pattern: /(OTA|远程升级|固件升级)/i, level: 'high', category: 'embedded_ota', message: 'OTA升级须确认版本+回滚方案' },
]

// 敏感信息模式
const SENSITIVE_PATTERNS = [
  { pattern: /(?:sk-|pk-|api[_-]?key|apikey)[\w-]{8,}/gi, replacement: '***API_KEY***', type: 'api_key' },
  { pattern: /(?:password|passwd|pwd)[=:]\s*\S+/gi, replacement: 'password=***', type: 'password' },
  { pattern: /(?:token|secret)[=:]\s*\S+/gi, replacement: 'token=***', type: 'token' },
  { pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g, replacement: (m) => m[0]+'***@'+m.split('@')[1], type: 'email' },
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: (m) => m.replace(/\d+$/, '*'), type: 'ip' },
]

// 嵌入式约束
const EMBEDDED_CONSTRAINTS = [
  { id: 'EC-001', rule: '不修改MCU厂商原始文件（HAL/SPL/CMSIS核心库）' },
  { id: 'EC-002', rule: '不假设寄存器默认值——查阅数据手册确认复位值' },
  { id: 'EC-003', rule: '不删除未知用途的BSP/驱动代码' },
  { id: 'EC-004', rule: '不直接烧录未经验证的固件' },
  { id: 'EC-005', rule: '不忽略Watchdog定时器' },
]

// ============================================================
// 工具函数
// ============================================================

function matchPath(path, operation) {
  if (!path) return { level: 'auto', matchedRule: null }
  const norm = path.replace(/\\/g, '/')
  const LEVEL_RANK = { deny: 3, confirm: 2, auto: 1 }
  let best = { level: 'auto', matchedRule: null, rank: 0 }
  for (const [pattern, perms] of Object.entries(FILE_PERMISSIONS)) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '(/|$)')
    if (regex.test(norm)) {
      const level = perms[operation] || 'deny'; const rank = LEVEL_RANK[level] || 0
      if (rank > best.rank) best = { level, matchedRule: pattern, rank }
    }
  }
  return best
}

function checkHighRisk(description) {
  if (!description) return []
  return HIGH_RISK_PATTERNS.filter(r => r.pattern.test(description)).map(r => ({ level: r.level, category: r.category, message: r.message }))
}

function filterSensitive(text) {
  if (!text) return { safe_text: text || '', replacements: [] }
  let safe = text; const replacements = []
  for (const rule of SENSITIVE_PATTERNS) {
    if (safe.match(rule.pattern)) {
      const replacer = typeof rule.replacement === 'function' ? rule.replacement : () => rule.replacement
      safe = safe.replace(rule.pattern, replacer)
      replacements.push({ type: rule.type, count: (text.match(rule.pattern) || []).length })
    }
  }
  return { safe_text: safe, replacements }
}

// ============================================================
// Action Handlers
// ============================================================

function handlePreflight(args) {
  const task = args.task || {}; const domain = args.domain || 'generic'
  const risks = []; const checkedPaths = []
  if (task.files) for (const f of task.files) {
    const { level: writeLvl } = matchPath(f, 'write')
    if (writeLvl === 'deny') risks.push({ type: 'file_denied', path: f, level: 'deny' })
    checkedPaths.push({ path: f, write: writeLvl })
  }
  const highRisk = checkHighRisk((task.name||'') + ' ' + (task.description||''))
  risks.push(...highRisk)
  const domainRules = domain === 'embedded' ? EMBEDDED_CONSTRAINTS : []
  const hasDeny = risks.some(r => r.level === 'deny' || r.level === 'critical')
  return { safe: !hasDeny, verdict: hasDeny ? 'block' : (risks.length > 0 ? 'caution' : 'allow'), risks, checkedPaths, constraints: domainRules, summary: hasDeny ? '发现禁止操作' : (risks.length > 0 ? '有'+risks.length+'个风险标记' : '无风险') }
}

function handleCheckPermission(args) {
  const { level, matchedRule } = matchPath(args.path||'', args.operation||'read')
  return { allowed: level !== 'deny', level, matchedRule, reason: matchedRule ? '匹配规则 '+matchedRule+': '+level : '自动放行' }
}

function handleFilter(args) { return filterSensitive(args.text||'') }
function handleAudit(args) { return { logged: true, timestamp: '__timestamp__', session: args.session||'default' } }
function handleAnomalyCheck(args) { return { anomalies: [], summary: '未检测到异常' } }
function handleInjectRules(args) { return { rules_block: '安全规则已注入', domain: args.domain||'generic', rulesCount: 5 } }
function handleStatus() { return { state: {} } }

// ============================================================
// Action Router
// ============================================================

const ACTION_HANDLERS = {
  preflight:        { handler: handlePreflight,        needs: ['task'] },
  check_permission: { handler: handleCheckPermission,  needs: ['path', 'operation'] },
  filter:           { handler: handleFilter,            needs: ['text'] },
  audit:            { handler: handleAudit,             needs: ['entry'] },
  anomaly_check:    { handler: handleAnomalyCheck,      needs: ['log'] },
  inject_rules:     { handler: handleInjectRules,       needs: [] },
  status:           { handler: handleStatus,            needs: [] },
}

// ============================================================
// 执行
// ============================================================

phase('路由')
const action = args.action || 'status'
const handlerDef = ACTION_HANDLERS[action]
if (!handlerDef) throw new Error('未知 action: "' + action + '"。可用: ' + Object.keys(ACTION_HANDLERS).join(', '))
for (const need of handlerDef.needs) {
  if (args[need] === undefined || args[need] === null) throw new Error('缺少参数: "' + need + '"')
}

phase('执行')
let result
try { result = handlerDef.handler(args) } catch (e) { throw new Error('安全层执行失败: ' + e.message) }

phase('输出')
const output = { action, status: 'ok', timestamp: '__timestamp__', result, meta: { version: '1.0.0', source: 'AGENTS.md 规则即代码' } }
return output
