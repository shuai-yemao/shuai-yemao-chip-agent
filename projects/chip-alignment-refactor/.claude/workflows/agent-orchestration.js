// Agent 编排层 Workflow（通用调度引擎 + 可插拔领域配置）
// 输入：施工包（任务列表 + 依赖关系 + 验收标准）
// 输出：按批次交付的完成结果（经三层门禁）
//
// 使用方式：
//   Workflow({ name: 'agent-orchestration', args: { tasks: [...], acceptance: [...] } })
//   // 默认加载 embedded 领域配置。切到通用: args: { ..., domain: 'generic' }

export const meta = {
  name: 'agent-orchestration',
  description: 'Agent 编排层：依赖图调度 + 并行分发 + 三层门禁 + 重试机制（通用引擎 + 可插拔领域配置）',
  phases: [
    { title: '记忆注入', detail: 'Phase 0: 检索相关记忆，注入 agent prompt' },
    { title: '解析', detail: '构建依赖图，分批' },
    { title: '派发', detail: '按批次派发 Agent，并行执行' },
    { title: '审查', detail: 'AI 自动审查 + 验收确认' },
    { title: '交付', detail: '汇总输出 + Phase 5: 执行摘要写回记忆' },
  ],
}

// ============================================================
// Schema 定义
// ============================================================

const TASK_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    description: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    depends_on: { type: 'array', items: { type: 'string' } },
    techniques: { type: 'array', items: { type: 'string' }, description: '需要的技术/方法/工具' },
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

// ============================================================
// 领域配置 — 可插拔
// 完整配置参考: domains/{name}.js
// ============================================================

const DOMAINS = {
  // ── 嵌入式领域（默认）──
  embedded: {
    skillCategory: {
      'embedded-debugger-framework': 'debug', 'cmbacktrace-debug': 'debug',
      'arm-interrupt-exception': 'debug', 'interrupt-optimization': 'debug',
      'arm-memory-architecture': 'debug', 'rtos-debug': 'debug',
      'freertos-module': 'debug', 'arm-core-registers': 'debug',
      'mcu-peripheral-registers': 'debug',
      'build-cmake': 'build', 'build-keil': 'build', 'build-iar': 'build',
      'build-idf': 'build', 'build-platformio': 'build',
      'flash-openocd': 'build', 'flash-keil': 'build', 'flash-idf': 'build',
      'flash-platformio': 'build', 'flash-jlink': 'build', 'code-porting': 'build',
      'debug-gdb-openocd': 'build', 'debug-platformio': 'build',
      'serial-monitor': 'monitor', 'uart-module': 'monitor', 'rtt-monitor': 'monitor',
      'can-debug': 'comm', 'modbus-debug': 'comm', 'i2c-bus': 'comm',
      'spi-bus': 'comm', 'ble-module': 'comm', 'wifi-module': 'comm',
      'lora-module': 'comm', 'cellular-module': 'comm', 'gps-module': 'comm',
      'mqtt-module': 'comm',
      'peripheral-driver': 'driver', 'stm32-hal-development': 'driver',
      'stm32-spl-development': 'driver', 'timer-module': 'driver',
      'adc-module': 'driver', 'dma-module': 'driver', 'flash-module': 'driver',
      'usb-module': 'driver', 'sram-module': 'driver', 'motor-control': 'driver',
      'lowpower-design': 'system', 'bootloader-design': 'system',
      'ota-update-system': 'system', 'watchdog-module': 'system',
      'static-analysis': 'quality', 'coding-standards': 'quality',
      'embedded-reviewer': 'quality', 'map-analyzer': 'quality',
      'linker-scatter': 'quality', 'doc-automation': 'quality',
      'embedded-architect': 'arch',
      'embedded-learning-path-framework': 'arch', 'embedded-learning-notes': 'arch',
      'brainstorming': 'workflow', 'writing-plans': 'workflow', 'executing-plans': 'workflow',
      'pcb-analysis': 'analysis',
      'option-bytes': 'release', 'firmware-sign': 'release',
      'ota-package': 'release', 'gang-flash': 'release',
      'fatfs-module': 'middleware', 'aes-module': 'middleware', 'rsa-module': 'middleware',
      'crc-module': 'middleware', 'ymodem-module': 'middleware', 'lvgl-module': 'middleware',
      'dsp-module': 'middleware', 'fft-module': 'middleware', 'sfud-module': 'middleware',
      'segger-rtt-module': 'middleware', 'elog-module': 'middleware',
      'knowledge-base-search': 'knowledge', 'kb-datasheet': 'knowledge',
      'kb-import': 'knowledge', 'kb-record': 'knowledge', 'kb-verify': 'knowledge',
    },
    categoryPrompts: {
      debug: '优先定位症状根因，再实现修复代码；使用五层模型：症状→隔离→根因→修复→验证',
      build: '确保构建脚本和链接配置正确；验证编译产物完整性',
      monitor: '配置监控通道，验证数据输出格式正确',
      comm: '按协议规范逐字节验证，注意时序和错误处理；怀疑协议问题时可抓包比对',
      driver: '封装 init/read_write/irq_callback 三层 API，编写上电自检函数',
      system: '分析系统级约束，量化方案权衡（功耗/性能/安全）',
      quality: '逐行审查代码，记录所有违规项并给出修复建议',
      arch: '从模块边界和接口契约出发设计，先定义接口再实现内部逻辑',
      workflow: '严格按流程步骤执行，不跳步骤',
      analysis: '逐网络/引脚分析，记录所有异常点和冲突',
      release: '确认所有不可逆操作前经用户批准；验证产物签名和完整性',
      middleware: '检查接口对齐和依赖版本兼容性',
      knowledge: '多来源交叉验证技术断言，标注每条信息的可信度',
      general: '按任务描述执行，确保产出符合验收标准',
    },
    troubleshootingMap: [
      { keywords: ['i2c', 'busy', '卡死'], step1: 'i2c-bus: 9脉冲法/SWRST复位I2C外设', step2: '检查SCL/SDA电平确认硬件连接' },
      { keywords: ['spi', 'bsy', '假死', 'stuck'], step1: 'spi-bus: CR1复位SPI外设', step2: '检查SPI_SR状态位，确认BSY标志已清除' },
      { keywords: ['hardfault', 'hard fault', '异常'], step1: 'cmbacktrace-debug: 一键分析HardFault栈回溯', step2: 'arm-core-registers: 手动解码CFSR/BFSR/UFSR' },
      { keywords: ['uart', '串口', '乱码', '收不到'], step1: 'uart-module: 核对波特率/数据位/停止位/ORE标志', step2: 'serial-monitor: 检查串口线序和电平转换' },
      { keywords: ['adc', '跳变', '不准', '抖动'], step1: 'adc-module: 检查采样时间/参考电压/校准', step2: 'stm32-hal-development: 验证ADC时钟分频' },
      { keywords: ['pwm', '无输出'], step1: 'timer-module: 检查MOE主输出使能和刹车输入', step2: 'mcu-peripheral-registers: 检查TIM_CR1/CR2配置' },
      { keywords: ['dma', '传输中断', '不完成'], step1: 'dma-module: 检查FIFO/DBM位/中断标志', step2: 'stm32-hal-development: 验证DMA与外设握手信号' },
      { keywords: ['flash', '写入失败', '编程错误'], step1: 'flash-module: 检查等待周期/解锁序列/擦除操作', step2: 'mcu-peripheral-registers: 检查FLASH_SR错误位' },
      { keywords: ['usb', '枚举失败'], step1: 'usb-module: 检查时钟配置/描述符/上拉电阻', step2: 'stm32-hal-development: 验证USB内核初始化顺序' },
      { keywords: ['rtos', '死锁', '挂起', '任务阻塞'], step1: 'rtos-debug: 检查任务状态列表和栈高水位', step2: 'freertos-module: 验证临界区和信号量使用' },
      { keywords: ['寄存器写不进', '无响应', '超时'], step1: 'mcu-peripheral-registers: 检查外设时钟使能和复位状态', step2: 'stm32-hal-development: 验证HAL初始化顺序' },
      { keywords: ['看门狗', '复位', '喂狗'], step1: 'watchdog-module: 检查RCC_CSR复位原因寄存器', step2: 'embedded-debugger-framework: 确认喂狗周期和主循环路径' },
    ],
    verificationCriteria: `
=== 知识验证标准 ===
对Agent产出的技术断言进行验证:
1. 来源可信度: 参考手册(1.0) > HAL源码(0.85) > 社区(0.50) > 论坛(0.30) > 博客(0.25)
2. 危险标记: 检测 "仅供参考/TODO/可能/未经测试" — 存在即标记不可靠
3. 交叉验证: 寄存器值/API签名/时序参数必须至少2源比对
4. 版本对齐: 确认API版本与目标MCU/固件包版本匹配
5. 可信评级: ≥0.70直接采信, 0.40-0.69需交叉验证, <0.40仅作线索`,

    memory: {
      enabled: true,
      dir: 'C:/Users/zhang/.claude/projects/c--Users-zhang/memory',
      phase0: true,
      phase5: true,
      max_context_tasks: 5,
    },
    security: {
      enabled: true,
      preflight: true,
      prompt_injection: true,
      audit: true,
    },
  },

  // ── 通用领域 ──
  generic: {
    skillCategory: {},
    categoryPrompts: {
      general: '按任务描述执行，确保产出符合验收标准',
    },
    troubleshootingMap: [],
    verificationCriteria: `
=== 验证标准 ===
1. 代码正确性: 逻辑无遗漏，边界条件已处理
2. 变更范围: 仅修改预期内的文件，无意外改动
3. 测试充分: 核心路径和异常路径均有覆盖`,

    memory: {
      enabled: false,
    },
    security: {
      enabled: true,
      preflight: true,
      prompt_injection: true,
      audit: false,
    },
  },
}

// 安全配置降级：如果 memory 未启用但 security audit 开启，自动关闭 audit
for (const key of Object.keys(DOMAINS)) {
  const dc = DOMAINS[key]
  if (dc.security?.enabled && dc.security?.audit && !dc.memory?.enabled) {
    dc.security.audit = false
  }
}

// 选择领域配置（默认 embedded）
const domainConfig = DOMAINS[args.domain] || DOMAINS.embedded
if (args.domain && !DOMAINS[args.domain]) {
  log(`⚠️ 未知领域 "${args.domain}"，回退到 embedded`)
}

// ============================================================
// 依赖图构建
// ============================================================

function buildBatches(tasks) {
  const taskMap = {}
  for (const t of tasks) taskMap[t.id] = { ...t, dependents: [], level: 0 }

  for (const t of tasks) {
    for (const dep of t.depends_on || []) {
      if (taskMap[dep]) taskMap[dep].dependents.push(t.id)
    }
  }

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

  const schedulable = batches.flat().length
  if (schedulable < tasks.length) {
    throw new Error(`循环依赖: ${tasks.length} 个任务中只有 ${schedulable} 个可调度`)
  }

  return batches
}

// ============================================================
// 执行
// ============================================================

phase('Step 1: 解析施工包')

const tasks = args.tasks
if (!tasks || !tasks.length) throw new Error('缺少任务列表')

log(`收到 ${tasks.length} 个任务 | 领域: ${domainConfig.name}`)
const acceptance = args.acceptance || []

const batches = buildBatches(tasks)
log(`依赖图构建完成: ${batches.length} 个批次`)
for (let i = 0; i < batches.length; i++) {
  log(`  Batch ${i + 1}: ${batches[i].map(t => t.name).join(', ')}`)
}

// ============================================================
// Phase 0: 记忆上下文注入
// ============================================================

let memoryContext = ''

if (domainConfig.memory?.enabled && domainConfig.memory?.phase0) {
  phase('Phase 0: 记忆注入')
  log('检索相关记忆，注入 agent prompt...')

  try {
    const ctx = await workflow('memory-layer', {
      action: 'context',
      for: tasks.map(t => `${t.name}: ${t.description}`).join('\n'),
      memory_dir: domainConfig.memory.dir,
    })

    if (ctx?.context) {
      memoryContext = ctx.context
      log(`✅ 注入 ${ctx.source_count || '?'} 条记忆上下文 (${ctx.context.length} 字符)`)
    } else {
      log('未匹配到相关记忆')
    }
  } catch (e) {
    log(`⚠️ 记忆检索失败: ${e.message || e}，跳过`)
  }
}

// ============================================================
// Phase 0.5: 安全预检
// ============================================================

let securityRulesBlock = ''
const securityConfig = domainConfig.security
const securityBlockedTasks = []
// 生成稳定 session ID，Phase 0.5/2.5 共用
const orchestrationSessionId = `orch-${String(Date.now()).slice(-6)}-${Math.random().toString(36).slice(2, 4)}`

if (securityConfig?.enabled && securityConfig?.preflight) {
  phase('Phase 0.5: 安全预检')

  // 1. 加载安全规则
  if (securityConfig?.prompt_injection) {
    try {
      const rulesResult = await workflow('security-layer', {
        action: 'inject_rules',
        domain: domainConfig.name || 'generic',
      })
      if (rulesResult?.rules_block) {
        securityRulesBlock = rulesResult.rules_block
        log(`✅ 安全规则加载: ${rulesResult.active_rules_count} 条 (${rulesResult.active_rules?.join(', ') || ''})`)
        if (rulesResult.agents_md_changed) {
          log(`⚠️ ${rulesResult.agents_md_warning}`)
        }
      }
    } catch (e) {
      log(`⚠️ 安全规则加载失败: ${e.message || e}，跳过`)
    }
  }

  // 2. 预检每个任务
  for (const task of tasks) {
    try {
      const preflight = await workflow('security-layer', {
        action: 'preflight',
        task: {
          id: task.id,
          name: task.name,
          description: task.description,
          files: task.files || [],
          command: '',
        },
        domain: domainConfig.name || 'generic',
        session: orchestrationSessionId,
      })

      if (!preflight) {
        log(`  ${task.name}: ⚠️ 安全预检无响应，放行`)
        continue
      }

      if (preflight.level === 'deny') {
        log(`  ${task.name}: ❌ 安全预检拒绝 — ${(preflight.violations || []).join('; ') || '违反安全规则'}`)
        securityBlockedTasks.push(task.id)
        // 记录审计
        try {
          await workflow('security-layer', {
            action: 'audit',
            entry: { type: 'preflight-deny', task_id: task.id, task_name: task.name, violations: preflight.violations },
            session: orchestrationSessionId,
          })
        } catch (_) { /* skip audit on failure */ }
      } else if (preflight.level === 'confirm') {
        const warnings = preflight.warnings || []
        const confirms = preflight.required_confirmations || []
        log(`  ${task.name}: ⚠️ 安全预检需确认 (${warnings.length} 警告, ${confirms.length} 项需确认)`)
        for (const w of warnings) log(`    ⚠️ ${w}`)
        for (const c of confirms) log(`    🔶 [${c.severity}] ${c.detail}`)
      } else {
        log(`  ${task.name}: ✅ 安全预检通过`)
      }
    } catch (e) {
      log(`  ${task.name}: ⚠️ 安全预检异常: ${e.message || e}，放行`)
    }
  }

  if (securityBlockedTasks.length > 0) {
    log(`\n⚠️ 安全预检阻止了 ${securityBlockedTasks.length} 个任务`)
    for (const id of securityBlockedTasks) {
      log(`  ❌ ${id}: 因安全规则拒绝执行`)
    }
  }
}

// ============================================================
// 派发与执行
// ============================================================

const allResults = []
const failedTasks = []
const blockedTasks = [...securityBlockedTasks]

phase('Step 2: 派发执行')

for (let b = 0; b < batches.length; b++) {
  const batch = batches[b]
  log(`\n=== Batch ${b + 1}/${batches.length} ===`)

  const batchResults = await parallel(
    batch.map(task => async () => {
      if (blockedTasks.length > 0 && task.depends_on?.some(d => blockedTasks.includes(d))) {
        log(`${task.name}: 前置任务失败，跳过`)
        blockedTasks.push(task.id)
        return null
      }

      log(`${task.name}: 执行中...`)

      // 技能路由：查领域配置获得类别级执行提示
      const techniques = task.techniques || []
      const taskCats = techniques
        .map(s => domainConfig.skillCategory[s])
        .filter(Boolean)
      const routingHints = [...new Set(taskCats)]
        .map(c => domainConfig.categoryPrompts[c] || domainConfig.categoryPrompts.general || '')
        .filter(Boolean)
        .join('\n')
      const skillGuidance = routingHints
        ? `\n[领域路由提示]\n${routingHints}`
        : ''

      const memoryBlock = memoryContext
        ? `\n\n=== 相关历史记忆（仅供参考）===\n${memoryContext}`
        : ''

      const securityBlock = securityRulesBlock
        ? `\n\n${securityRulesBlock}`
        : ''

      const result = await agent(
        `执行任务: ${task.name}\n描述: ${task.description}${skillGuidance}\n文件: ${task.files.join(', ')}\n验收标准: ${(task.acceptance || []).join(', ')}${memoryBlock}${securityBlock}`,
        { schema: EXECUTION_RESULT_SCHEMA }
      )

      if (!result) {
        return { result: { task_id: task.id, status: 'FAILED', summary: 'Agent 执行失败（API 错误）', error: 'subagent returned null' }, task }
      }

      // 隐私过滤：对 agent 输出进行脱敏
      if (securityConfig?.enabled && securityConfig?.filter_output && result.summary) {
        try {
          const filtered = await workflow('security-layer', {
            action: 'filter',
            text: result.summary,
          })
          if (filtered?.sanitized) {
            result.summary = filtered.sanitized
          }
        } catch (_) { /* 过滤失败不影响执行 */ }
      }

      return { result, task }
    })
  )

  for (const item of batchResults) {
    if (!item) continue
    const { result, task } = item

    if (result.status === 'SUCCESS') {
      log(`${task.name}: ✅ 成功`)
      allResults.push(result)
    } else {
      log(`${task.name}: ❌ 失败 (第1次) - ${result.error}`)
      log(`    自动重试...`)

      // 排查匹配：查领域配置的诊断表
      const diag = domainConfig.troubleshootingMap
        .filter(e => e.keywords.some(kw =>
          task.description.toLowerCase().includes(kw) ||
          (result.error || '').toLowerCase().includes(kw)
        ))
        .map(e => `  疑似: ${e.keywords[0]}\n  第一步: ${e.step1}\n  第二步: ${e.step2}`)
        .join('\n')
      const diagnoseHints = diag ? `\n=== 诊断建议 ===\n${diag}` : ''

      const retryResult = await agent(
        `重试任务: ${task.name}\n描述: ${task.description}${diagnoseHints}\n注意：上次失败原因: ${result.error}\n文件: ${task.files.join(', ')}`,
        { schema: EXECUTION_RESULT_SCHEMA }
      )

      if (!retryResult) {
        log(`${task.name}: ❌ 重试也失败（API 错误）`)
        failedTasks.push({ task, error: 'subagent returned null on retry' })
        blockedTasks.push(task.id)
      } else if (retryResult.status === 'SUCCESS') {
        log(`${task.name}: ✅ 重试成功`)
        // 隐私过滤重试结果
        if (securityConfig?.enabled && securityConfig?.filter_output && retryResult.summary) {
          try {
            const filtered = await workflow('security-layer', {
              action: 'filter',
              text: retryResult.summary,
            })
            if (filtered?.sanitized) retryResult.summary = filtered.sanitized
          } catch (_) {}
        }
        allResults.push(retryResult)
      } else {
        log(`${task.name}: ❌ 重试也失败 - ${retryResult.error || 'unknown'}`)
        failedTasks.push({ task, error: retryResult.error || result.error || 'unknown' })
        blockedTasks.push(task.id)
      }
    }
  }

  if (blockedTasks.length > 0) {
    log(`\n⚠️ 批次 ${b + 1} 有任务失败，停止调度`)
    break
  }
}

// ============================================================
// Phase 2.5: 安全审计
// ============================================================

if (securityConfig?.enabled && securityConfig?.audit) {
  phase('Phase 2.5: 安全审计')

  // 记录成功的操作
  for (const r of allResults) {
    try {
      await workflow('security-layer', {
        action: 'audit',
        entry: {
          type: 'task-execution',
          task_id: r.task_id,
          status: r.status,
          files_changed: r.files_changed || [],
          summary: r.summary?.substring(0, 200) || '',
        },
        session: orchestrationSessionId,
      })
    } catch (_) { /* skip */ }
  }

  // 记录失败的操作
  for (const f of failedTasks) {
    try {
      await workflow('security-layer', {
        action: 'audit',
        entry: {
          type: 'task-failure',
          task_id: f.task.id,
          error: f.error?.substring(0, 200) || 'unknown',
        },
        session: orchestrationSessionId,
      })
    } catch (_) { /* skip */ }
  }

  log(`✅ 安全审计: ${allResults.length} 条成功 + ${failedTasks.length} 条失败记录已写入`)
}

// ============================================================
// 审查
// ============================================================

phase('Step 3: 质量门禁')

const reviewResults = []
for (const r of allResults) {
  const securityReviewHint = securityConfig?.enabled
    ? '\n4) 安全合规性: 是否违反文件权限/高危操作/隐私保护规则'
    : ''
  const review = await agent(
    `审查任务 ${r.task_id} 的完成结果:\n变更文件: ${(r.files_changed || []).join(', ')}\n测试结果: ${r.test_results || '无'}\n摘要: ${r.summary}\n\n检查：1) 代码正确性 2) 变更范围是否符合预期 3) 测试是否充分${securityReviewHint}${domainConfig.verificationCriteria}`,
    { schema: REVIEW_SCHEMA }
  )
  if (!review) {
    log(`${r.task_id}: ⚠️ 审查跳过（API 错误）`)
    reviewResults.push({ task_id: r.task_id, passed: false, issues: ['审查 agent 不可用'] })
  } else {
    reviewResults.push(review)
    log(`${r.task_id}: ${review.passed ? '✅ 审查通过' : '❌ 审查不通过'}`)
  }
}

const passedReviews = reviewResults.filter(r => r.passed).length
log(`\nAI 审查: ${passedReviews}/${reviewResults.length} 通过`)

// ============================================================
// 汇总
// ============================================================

phase('Step 4: 交付')

const output = {
  summary: {
    total: tasks.length,
    completed: allResults.length,
    failed: failedTasks.length,
    blocked: blockedTasks.length,
    domain: domainConfig.name,
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
    passed: acceptance.length,
    items: acceptance.map(a => ({ item: a, status: '待你确认' })),
  },
  next_steps: failedTasks.length > 0
    ? `有 ${failedTasks.length} 个任务需要你决断后再继续`
    : '所有批次完成，请验证结果',
}

log(`\n=== 交付摘要 ===`)
log(`领域: ${domainConfig.name}`)
log(`完成任务: ${output.summary.completed}`)
log(`失败任务: ${output.summary.failed}`)
log(`阻塞任务: ${output.summary.blocked}`)

// ============================================================
// Phase 5: 执行摘要写回记忆
// ============================================================

if (domainConfig.memory?.enabled && domainConfig.memory?.phase5) {
  phase('Phase 5: 记忆写回')
  log('写入执行摘要到记忆层...')

  const taskNameMap = {}
for (const t of tasks) taskNameMap[t.id] = t.name

const summaryContent = [
    `# 执行摘要 — ${domainConfig.name}`,
    '',
    `## 任务 (${tasks.length})`,
    ...(output.results || []).map(r => `- ${r.task_id}: ${taskNameMap[r.task_id] || '?'} ${r.status === 'SUCCESS' ? '✅' : '❌'}`),
    ...(output.failed_tasks || []).map(f => `- ${f.id}: ${taskNameMap[f.id] || f.name} ❌ ${f.error}`),
    '',
    '## 结果',
    `- 完成: ${output.summary.completed}`,
    `- 失败: ${output.summary.failed}`,
    `- 阻塞: ${output.summary.blocked}`,
  ].join('\n')

  try {
    const writeResult = await workflow('memory-layer', {
      action: 'write',
      name: `exec-${String(Date.now()).slice(-6)}`,
      description: `编排层执行摘要 — ${tasks.length} 个任务`,
      type: 'execution-summary',
      content: summaryContent,
      memory_dir: domainConfig.memory.dir,
    })
    if (writeResult?.success) {
      log(`✅ 执行摘要已写回记忆层: ${writeResult.file}`)
    } else {
      log(`⚠️ 记忆写回未成功: ${writeResult?.error || '未知'}`)
    }
  } catch (e) {
    log(`⚠️ 记忆写回失败: ${e.message || e}，跳过`)
  }
}

return output
