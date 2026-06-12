// Agent 编排层 Workflow — 手动 TDD 流程管理
// 使用方式: Workflow({ name: 'agent-orchestration', args: { tasks: [...], acceptance: [...] } })

export const meta = {
  name: 'agent-orchestration',
  description: '编排层：依赖图分批+skill推荐→指引手动实现→用户逐条判决验收项→汇总',
  phases: [
    { title: '解析', detail: '依赖图分批' },
    { title: 'Phase 0.5', detail: '安全预检' },
    { title: '手动 TDD', detail: '分批指引+skill推荐' },
    { title: 'Phase 2.5', detail: '审计日志' },
    { title: '汇总' },
  ],
}

// 领域技能映射
const SKILL_CATEGORY = {
  'timer-module': { cat: 'driver', tip: '定时器PSC/ARR/中断配置' },
  'mcu-peripheral-registers': { cat: 'debug', tip: 'GPIO/RCC/定时器寄存器操作' },
  'arm-interrupt-exception': { cat: 'arch', tip: '中断/异常/优先级/向量表' },
  'stm32-hal-development': { cat: 'driver', tip: 'STM32 HAL库使用模式' },
  'i2c-bus': { cat: 'comm', tip: 'I2C协议时序, 9脉冲法/SWRST' },
  'spi-bus': { cat: 'comm', tip: 'SPI协议时序, CPOL/CPHA' },
  'uart-module': { cat: 'comm', tip: 'UART波特率/数据位/停止位' },
  'freertos-module': { cat: 'middleware', tip: 'FreeRTOS任务/队列/信号量' },
  'dma-module': { cat: 'driver', tip: 'DMA配置, 传输模式' },
  'adc-module': { cat: 'driver', tip: 'ADC采样时间/参考电压/校准' },
  'debug-gdb-openocd': { cat: 'debug', tip: 'GDB+OpenOCD调试' },
  'embedded-reviewer': { cat: 'quality', tip: '中断安全/可重入/DMA缓冲区审查' },
}

function buildBatches(tasks) {
  const taskMap = {}
  for (const t of tasks) taskMap[t.id] = { ...t, dependents: [], level: 0 }
  for (const t of tasks) for (const dep of t.depends_on || []) if (taskMap[dep]) taskMap[dep].dependents.push(t.id)
  const inDegree = {}; for (const t of tasks) inDegree[t.id] = (t.depends_on || []).length
  const queue = []; for (const t of tasks) if (inDegree[t.id] === 0) queue.push(t.id)
  const batches = []
  while (queue.length > 0) { const batch = []; const size = queue.length; for (let i = 0; i < size; i++) { const id = queue.shift(); batch.push(taskMap[id]); for (const dep of taskMap[id].dependents) { inDegree[dep]--; if (inDegree[dep] === 0) queue.push(dep) } } batches.push(batch) }
  const schedulable = batches.flat().length
  if (schedulable < tasks.length) throw new Error('循环依赖')
  return batches
}

const tasks = args.tasks; if (!tasks?.length) throw new Error('缺少任务列表')
const acceptance = args.acceptance || []
const domain = args.domain || 'embedded'
const batches = buildBatches(tasks)

log(tasks.length + ' 个任务, ' + batches.length + ' 个批次')

// Phase 0.5: 安全预检
phase('Phase 0.5: 安全预检')
for (const batch of batches) {
  for (const task of batch) {
    const result = await workflow('safety-layer', { action: 'preflight', task: { name: task.name, description: task.description, files: task.files }, domain })
  }
}

// 输出分批指引
phase('手动 TDD 分批指引')
for (let b = 0; b < batches.length; b++) {
  log('--- Batch ' + (b+1) + '/' + batches.length + ' ---')
  for (const task of batches[b]) {
    const recs = (task.techniques || []).map(s => SKILL_CATEGORY[s]).filter(Boolean)
    log('[TASK] ' + task.id + ': ' + task.name)
    log('  files: ' + (task.files || []).join(', '))
    if (recs.length) log('  SKILLS: ' + recs.map(r => r.name).join(', '))
  }
}

// Phase 2.5: 审计
phase('Phase 2.5: 审计日志')
await workflow('safety-layer', { action: 'audit', entry: { type: 'orchestration_complete', tasks: tasks.length, batches: batches.length }, session: args.session || 'default' })

return {
  status: 'guide_ready', total_tasks: tasks.length, total_batches: batches.length,
  batches: batches.map((b, i) => ({ batch: i+1, tasks: b.map(t => t.id) })),
  tasks: tasks.map((t, i) => ({
    id: t.id, name: t.name,
    acceptance: (typeof acceptance[i] === 'string' ? acceptance[i] : acceptance[i]?.item) || '',
    skills: (t.techniques || []).filter(s => SKILL_CATEGORY[s]).map(s => s),
    status: 'pending', verdict: 'pending',
  })),
  acceptance_check: acceptance.map((a, i) => ({ index: i, task_id: tasks[i]?.id, item: typeof a === 'string' ? a : (a.item || ''), verdict: 'pending', judge: '用户判决' })),
}
