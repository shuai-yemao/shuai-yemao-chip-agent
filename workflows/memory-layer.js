// 记忆层 Workflow — 持久化记忆读写+上下文注入+检索
// 使用方式: Workflow({ name: 'memory-layer', args: { action: 'search', query: 'I2C' } })

export const meta = {
  name: 'memory-layer',
  description: '记忆层：持久化记忆读写+上下文注入+检索',
  phases: [{ title: '检索' }, { title: '读写' }, { title: '交付' }],
}

const MEMORY_INDEX_SCHEMA = { type: 'object', properties: { matches: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, file: { type: 'string' }, type: { type: 'string' } } } } } }
const MEMORY_FILE_SCHEMA = { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, content: { type: 'string' }, type: { type: 'string' } } }
const MEMORY_WRITE_RESULT_SCHEMA = { type: 'object', properties: { success: { type: 'boolean' }, file: { type: 'string' }, path: { type: 'string' }, index_line: { type: 'string' }, error: { type: 'string' } } }

const MEMORY_DIR = args.memory_dir || 'C:/Users/default/.claude/projects/memory'
const MEMORY_INDEX_PATH = MEMORY_DIR + '/MEMORY.md'

const action = args.action || 'help'
const query = args.query || ''; const name = args.name || ''; const type = args.type || ''
const content = args.content || ''; const forContext = args.for || ''; const description = args.description || ''

let result = null

// Search
if (action === 'search') {
  result = await agent('搜索记忆索引 ' + MEMORY_INDEX_PATH + ' 匹配: "' + query + '"', { schema: MEMORY_INDEX_SCHEMA })
}

// List
if (action === 'list') {
  result = await agent('列出所有记忆索引 ' + MEMORY_INDEX_PATH + (type ? ' 过滤type=' + type : ''), { schema: MEMORY_INDEX_SCHEMA })
}

// Read
if (action === 'read' && name) {
  result = await agent('读取记忆文件 ' + MEMORY_DIR + '/' + name + '.md', { schema: MEMORY_FILE_SCHEMA })
}

// Write
if (action === 'write' && name && content) {
  result = await agent('写入记忆: ' + name + '\n内容: ' + content, { schema: MEMORY_WRITE_RESULT_SCHEMA })
}

// Context
if (action === 'context' && forContext) {
  const searchCtx = await agent('检索与任务相关的记忆: "' + forContext + '"', { schema: MEMORY_INDEX_SCHEMA })
  const relevant = (searchCtx?.matches || []).filter(Boolean)
  if (relevant.length === 0) {
    result = { context: '', source_count: 0 }
  } else {
    const reads = relevant.map(m => () => agent('读取 ' + MEMORY_DIR + '/' + m.file, { schema: MEMORY_FILE_SCHEMA }))
    const readResults = (await parallel(reads)).filter(Boolean)
    const fetched = readResults.filter(r => r?.name && r.content !== '[文件不存在]')
    const ctxStr = '<memory-context>\n' + fetched.map(f => '=== ' + f.name + ' ===\n' + f.content).join('\n') + '\n</memory-context>'
    result = { context: ctxStr, source_count: fetched.length }
  }
}

// Help
if (action === 'help') {
  result = { help: true, actions: ['search', 'list', 'read', 'write', 'context'] }
}

return result
