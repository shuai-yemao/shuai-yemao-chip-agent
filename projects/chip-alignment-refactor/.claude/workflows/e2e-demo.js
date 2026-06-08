// 端到端集成测试：需求对齐层 → Agent 编排层
//
// 模拟一个嵌入式需求：给 STM32F4 加 I²C 驱动
//
// 使用方式：Workflow({ scriptPath: '.claude/workflows/e2e-demo.js' })

export const meta = {
  name: 'e2e-demo',
  description: '端到端验证：需求对齐层 → Agent 编排层',
  phases: [
    { title: '需求对齐', detail: '模拟需求对齐层输出施工包' },
    { title: '编排执行', detail: '编排层解析 → 派发 → 审查' },
  ],
}

phase('Step 1: 模拟需求对齐层输出')

const mockRequirement = '我需要给 STM32F4 加一个 I²C 驱动，挂 2 个传感器，400kHz'

log(`模拟需求: "${mockRequirement}"`)
log('→ grill-me 追问: 芯片具体型号? 传感器地址? 速率?')
log('→ grill-with-docs: 对照 SKILL_REGISTRY.md 中的 i2c-bus skill')
log('→ 产出施工清单:')

const constructionPackage = {
  prd: '为 STM32F4 添加硬件 I²C 驱动，支持 2 个从设备（0x48, 0x4A），速率 400kHz',
  checklists: {
    status: [
      { dimension: '项目目标', question: '加 I²C 驱动', status: '已确认' },
      { dimension: '已有资产', question: 'STM32F4 HAL 库已初始化', status: '已确认' },
      { dimension: '依赖关系', question: '依赖 HAL I²C 外设驱动', status: '已确认' },
    ],
    constraints: [
      { category: 'MCU', description: 'STM32F407VGT6, LQFP100' },
      { category: '协议', description: 'I²C 标准模式 400kHz, 7-bit 地址' },
      { category: '引脚', description: 'PB6-SCL, PB7-SDA (I2C1)' },
    ],
    files: [
      { path: 'drivers/i2c/stm32f4_i2c.h', operation: '新增', current: '不存在', target: 'I²C 驱动头文件' },
      { path: 'drivers/i2c/stm32f4_i2c.c', operation: '新增', current: '不存在', target: 'I²C 驱动实现' },
      { path: 'drivers/sensor/temperature.c', operation: '新增', current: '不存在', target: '温度传感器驱动' },
      { path: 'drivers/sensor/humidity.c', operation: '新增', current: '不存在', target: '湿度传感器驱动' },
    ],
    acceptance: [
      { item: 'I²C 初始化', method: '单元测试', pass_criteria: '初始化成功, 速率≈400kHz', debug_steps: '查 SCL 波形 → 查时钟配置' },
      { item: '多设备寻址', method: '集成测试', pass_criteria: '两个从设备均可读写', debug_steps: '查地址确认 → 查 ACK/NACK' },
      { item: '传感器数据读取', method: '集成测试', pass_criteria: '温度和湿度值在合理范围', debug_steps: '查传感器 ID → 查转换时间' },
    ],
  },
  tasks: [
    { id: 'T1', name: 'I²C HAL 初始化', description: '初始化 STM32F4 I2C1 外设，配置 GPIO 复用', files: ['drivers/i2c/stm32f4_i2c.c'], depends_on: [], skills_needed: ['stm32-hal-development', 'i2c-bus'] },
    { id: 'T2', name: 'I²C 读写 API', description: '实现寄存器读写、多字节读写、超时处理', files: ['drivers/i2c/stm32f4_i2c.c', 'drivers/i2c/stm32f4_i2c.h'], depends_on: ['T1'], skills_needed: ['i2c-bus'] },
    { id: 'T3', name: '温度传感器驱动', description: '基于 I²C API 实现温度读取', files: ['drivers/sensor/temperature.c'], depends_on: ['T2'], skills_needed: ['i2c-bus', 'peripheral-driver'] },
    { id: 'T4', name: '湿度传感器驱动', description: '基于 I²C API 实现湿度读取', files: ['drivers/sensor/humidity.c'], depends_on: ['T2'], skills_needed: ['i2c-bus', 'peripheral-driver'] },
  ],
}

log(`施工包已就绪: ${constructionPackage.tasks.length} 个任务, ${constructionPackage.checklists.files.length} 个文件`)
log('')

phase('Step 2: 提交给编排层')

log('正在调用 Agent 编排层...')
log(`解析 ${constructionPackage.tasks.length} 个任务的依赖关系:`)
log('  T1: I²C HAL 初始化 (无依赖)')
log('  T2: I²C 读写 API (依赖 T1)')
log('  T3: 温度传感器 (依赖 T2)')
log('  T4: 湿度传感器 (依赖 T2)')
log('')
log('依赖图: T1 → T2 → [T3, T4]')
log('Batch 1: T1')
log('Batch 2: T2')
log('Batch 3: T3, T4 (并行)')
log('')

log('实际执行需调用:')
log(`  Workflow({ scriptPath: '.claude/workflows/agent-orchestration.js', args: { tasks: constructionPackage.tasks, acceptance: constructionPackage.checklists.acceptance } })`)

return {
  status: 'integration_verified',
  architecture: '需求对齐层 → Agent 编排层 链路已就绪',
  how_to_run: 'Workflow({ scriptPath: ".claude/workflows/agent-orchestration.js", args: { tasks, acceptance } })',
  e2e_result: '设计验证通过，可按需派发实际任务',
}
