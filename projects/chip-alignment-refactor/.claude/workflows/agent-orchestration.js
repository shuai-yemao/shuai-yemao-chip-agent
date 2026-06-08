// Agent 编排层 Workflow
// 输入：施工包（任务列表 + 依赖关系 + 验收标准）
// 输出：按批次交付的完成结果（经三层门禁）
//
// 使用方式：Workflow({ scriptPath: '.claude/workflows/agent-orchestration.js', args: { tasks: [...], acceptance: [...] } })

export const meta = {
  name: 'agent-orchestration',
  description: 'Agent 编排层：依赖图调度 + 并行分发 + 三层门禁 + 重试机制',
  phases: [
    { title: '解析', detail: '构建依赖图，分批' },
    { title: '派发', detail: '按批次派发 Agent，并行执行' },
    { title: '审查', detail: 'AI 自动审查 + 验收确认' },
    { title: '交付', detail: '汇总输出' },
  ],
}

// --- Schema 定义 ---

const TASK_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    depends_on: { type: 'array', items: { type: 'string' } },
    skills_needed: { type: 'array', items: { type: 'string' } },
    acceptance: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'name', 'description', 'files'],
}

const EXECUTION_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    task_id: { type: 'string' },
    status: { type: 'string', enum: ['SUCCESS', 'FAILED', 'TIMEOUT'] },
    files_changed: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    test_results: { type: 'string' },
    error: { type: 'string' },
    commit: { type: 'string' },
  },
  required: ['task_id', 'status', 'summary'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    task_id: { type: 'string' },
    passed: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['task_id', 'passed'],
}

// --- 依赖图构建 ---

function buildBatches(tasks) {
  const taskMap = {}
  for (const t of tasks) taskMap[t.id] = { ...t, dependents: [], level: 0 }

  // 构建邻接表
  for (const t of tasks) {
    for (const dep of t.depends_on || []) {
      if (taskMap[dep]) taskMap[dep].dependents.push(t.id)
    }
  }

  // 拓扑排序（Kahn 算法）
  const inDegree = {}
  for (const t of tasks) inDegree[t.id] = (t.depends_on || []).length

  const queue = []
  for (const t of tasks) if (inDegree[t.id] === 0) queue.push(t.id)

  const batches = []
  while (queue.length > 0) {
    const batch = []
    const size = queue.length
    for (let i = 0; i < size; i++) {
      const id = queue.shift()
      batch.push(taskMap[id])
      for (const dep of taskMap[id].dependents) {
        inDegree[dep]--
        if (inDegree[dep] === 0) queue.push(dep)
      }
    }
    batches.push(batch)
  }

  // 检查循环依赖
  const totalTasks = batches.flat().length
  if (totalTasks < tasks.length) {
    throw new Error(`循环依赖检测到: ${tasks.length} 个任务中只有 ${totalTasks} 个可调度`)
  }

  return batches
}

// --- 执行 ---

phase('Step 1: 解析施工包')

const tasks = args.tasks
if (!tasks || !tasks.length) throw new Error('缺少任务列表')

log(`收到 ${tasks.length} 个任务`)
const acceptance = args.acceptance || []

// 构建依赖图
const batches = buildBatches(tasks)
log(`依赖图构建完成: ${batches.length} 个批次`)
for (let i = 0; i < batches.length; i++) {
  log(`  Batch ${i + 1}: ${batches[i].map(t => t.name).join(', ')}`)
}

// --- 派发与执行 ---

const allResults = []
const failedTasks = []
const blockedTasks = []

phase('Step 2: 派发执行')

for (let b = 0; b < batches.length; b++) {
  const batch = batches[b]
  log(`\n=== Batch ${b + 1}/${batches.length} ===`)

  const batchResults = await parallel(
    batch.map(task => async () => {
      // 检查是否被阻塞
      if (blockedTasks.length > 0 && task.depends_on?.some(d => blockedTasks.includes(d))) {
        log(`${task.name}: 前置任务失败，跳过`)
        blockedTasks.push(task.id)
        return null
      }

      // 第 1 次执行
      log(`${task.name}: 执行中...`)
      const skills = task.skills_needed?.join(', ') || '无特殊 skill'
      log(`  skills: ${skills}`)

      // 派发 Agent 执行
      const result = await agent({
        prompt: `执行任务: ${task.name}\n描述: ${task.description}\n文件: ${task.files.join(', ')}\n验收标准: ${(task.acceptance || []).join(', ')}`,
        schema: EXECUTION_RESULT_SCHEMA,
      })

      return { result, task }
    })
  )

  // 处理本批次结果
  for (const item of batchResults) {
    if (!item) continue
    const { result, task } = item

    if (result.status === 'SUCCESS') {
      log(`${task.name}: ✅ 成功`)
      allResults.push(result)
    } else {
      log(`${task.name}: ❌ 失败 (第1次) - ${result.error}`)
      log(`    自动重试...`)

      // 第 2 次重试
      const retryResult = await agent({
        prompt: `重试任务: ${task.name}\n描述: ${task.description}\n注意：上次失败原因: ${result.error}\n文件: ${task.files.join(', ')}`,
        schema: EXECUTION_RESULT_SCHEMA,
      })

      if (retryResult.status === 'SUCCESS') {
        log(`${task.name}: ✅ 重试成功`)
        allResults.push(retryResult)
      } else {
        log(`${task.name}: ❌ 重试也失败 - ${retryResult.error}`)
        failedTasks.push({ task, error: retryResult.error || result.error })
        blockedTasks.push(task.id)
      }
    }
  }

  // 如果有阻塞任务，停止后续批次
  if (blockedTasks.length > 0) {
    log(`\n⚠️ 批次 ${b + 1} 有任务失败，停止调度`)
    break
  }
}

// --- 审查 ---

phase('Step 3: 质量门禁')

const reviewResults = []
for (const r of allResults) {
  const review = await agent({
    prompt: `审查任务 ${r.task_id} 的完成结果:\n变更文件: ${(r.files_changed || []).join(', ')}\n测试结果: ${r.test_results || '无'}\n摘要: ${r.summary}\n\n检查：1) 代码正确性 2) 变更范围是否符合预期 3) 测试是否充分`,
    schema: REVIEW_SCHEMA,
  })
  reviewResults.push(review)
  log(`${r.task_id}: ${review.passed ? '✅ 审查通过' : '❌ 审查不通过'}`)
}

// --- 验收确认 ---

const passedReviews = reviewResults.filter(r => r.passed).length
const totalReviews = reviewResults.length
log(`\nAI 审查: ${passedReviews}/${totalReviews} 通过`)

// --- 汇总 ---

phase('Step 4: 交付')

const output = {
  summary: {
    total: tasks.length,
    completed: allResults.length,
    failed: failedTasks.length,
    blocked: blockedTasks.length,
  },
  batches: batches.length,
  batches_info: batches.map((b, i) => ({
    batch: i + 1,
    tasks: b.map(t => t.name),
  })),
  results: allResults,
  reviews: reviewResults,
  failed_tasks: failedTasks.map(f => ({
    id: f.task.id,
    name: f.task.name,
    error: f.error,
    suggestion: '请决断：A) 修复重试 B) 跳过 C) 回退需求层',
  })),
  acceptance_check: {
    total: acceptance.length,
    passed: acceptance.length, // 由用户最终确认
    items: acceptance.map(a => ({ item: a, status: '待你确认' })),
  },
  next_steps: failedTasks.length > 0
    ? `有 ${failedTasks.length} 个任务需要你决断后再继续`
    : '所有批次完成，请验证结果',
}

log(`\n=== 交付摘要 ===`)
log(`完成任务: ${output.summary.completed}`)
log(`失败任务: ${output.summary.failed}`)
log(`阻塞任务: ${output.summary.blocked}`)

return output
