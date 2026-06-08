# 需求对齐层设计

> 五层 Agent 系统的第一层。将模糊需求转化为结构化文档和施工清单。

## 职责

**输入**: 自然语言 + 嵌入式专业术语混合的模糊需求
**输出**: PRD + 施工清单 4 项（现状确认表、代码约束清单、文件施工名单、验收测试清单）

**本层不写代码，只产出文档和清单。**

---

## 流程详解

```
用户输入（模糊需求）
    │
    ▼
┌─────────────────────────────────────┐
│  Step 1: 锚定方向（grill-me）        │
│  输入：模糊需求                       │
│  操作：逐问题追问，走遍决策树         │
│  产出：对齐后的需求描述               │
│  门禁：用户确认"对，这就是我要的"    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 2: 约束梳理（grill-with-docs） │
│  输入：对齐后的需求描述               │
│  操作：对照领域模型挑战方案           │
│        → 精炼术语                    │
│        → 产出 ADR                    │
│  产出：CONTEXT.md + ADR              │
│  门禁：无模糊术语、ADR 记录关键决策  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 3: 开工前 4 张表               │
│  输入：对齐需求 + 术语 + ADR         │
│  操作：按模板逐项输出                │
│  1. 现状确认表 — 先看有什么         │
│  2. 代码约束清单 — 不能做什么       │
│  3. 文件施工名单 — 改哪些文件       │
│  4. 验收测试清单 — 怎么算做对了     │
│  门禁：4 表齐全，用户逐项确认        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 4: 输出施工包                  │
│  输入：4 张表（已确认）             │
│  操作：→ to-prd → PRD              │
│        → to-issues → Issue 清单     │
│  产出：PRD + Issue 清单             │
│  门禁：PRD 覆盖所有用户故事         │
│        Issue 为垂直切片、可独立验证  │
└──────────────┬──────────────────────┘
               │
               ▼
         交付给 Agent 编排层
```

---

## Step 1: 锚定方向 — grill-me 详解

### 目的

消除模糊需求的歧义，建立共享理解。

### 操作方式

grill-me 逐问题追问，每个问题提供推荐答案，等用户回应后再问下一个。

### 决策树分支

根据用户回答，遵循以下分支路径：

```
输入：模糊需求
  │
  ├─ 需求足够清晰？
  │   ├─ 是 → 确认理解，进入 Step 2
  │   └─ 否 → 追问具体场景（谁在用？什么场景下？输入是什么？）
  │
  ├─ 目标已知？
  │   ├─ 是 → 确认目标
  │   └─ 否 → 追问"你想达成什么效果？"
  │
  ├─ 约束已知？
  │   ├─ 是 → 列出约束（技术/资源/时间）
  │   └─ 否 → 追问限制条件
  │
  └─ 可判断优先级？
      ├─ 是 → 确认优先级
      └─ 否 → 追问"哪部分最重要？"
```

### 嵌入式场景专项

当检测到嵌入式领域关键词时，自动触发专项追问。所有关键词 → 追问 → skill 映射统一由 [SKILL_REGISTRY.md](../../SKILL_REGISTRY.md) 管理，此处仅做分类概览。

| 领域 | 检测关键词 | 追问来源 |
|------|-----------|----------|
| MCU 架构 | ARM Cortex、STM32、芯片型号、寄存器 | SKILL_REGISTRY.md → MCU 架构 |
| 外设驱动 | ADC/DAC/DMA/Timer/Watchdog/I²C/SPI/UART/USB/CAN/电机/DSP | SKILL_REGISTRY.md → 外设驱动 |
| 无线通信 | BLE/WiFi/LoRa/GPS/Cellular/MQTT | SKILL_REGISTRY.md → 无线通信 |
| RTOS | FreeRTOS 任务/队列/信号量 | SKILL_REGISTRY.md → RTOS |
| 存储与文件系统 | FATFS/SFUD/SRAM/Flash/YMODEM | SKILL_REGISTRY.md → 存储与文件系统 |
| 构建与工具链 | CMake/IAR/Keil/IDF/PlatformIO/Linker Script | SKILL_REGISTRY.md → 构建与工具链 |
| 烧录与调试 | JLink/OpenOCD/ST-Link/GDB/RTT/Serial/Map/Option Bytes | SKILL_REGISTRY.md → 烧录与调试 |
| 安全与 OTA | AES/RSA/CRC/签名/Bootloader/OTA | SKILL_REGISTRY.md → 安全与 OTA |
| 低功耗 | Sleep/Stop/Standby/RTC | SKILL_REGISTRY.md → 低功耗 |
| 通用工程 | 编码规范/代码移植/驱动设计/中断优化 | SKILL_REGISTRY.md → 通用工程 |

---

## Step 2: 约束梳理 — grill-with-docs 详解

### 目的

对照领域模型挑战方案，精炼术语，记录架构决策。

### 产出物

| 产出 | 格式 | 用途 |
|------|------|------|
| CONTEXT.md | Markdown 术语表 | 项目级共享语言 |
| UBIQUITOUS_LANGUAGE.md | 扩展术语表 | 含 Example Dialogue |
| ADR | docs/adr/NNNN-slug.md | 关键架构决策记录 |

### 何时产出 ADR

同时满足以下 3 个条件：
1. **难以逆转** — 改主意成本高
2. **不读上下文会困惑** — 别人会问"为什么这么干？"
3. **有真正的权衡** — 存在真实可选的方案

### 嵌入式场景专项

嵌入式领域自动关联的检查项，每项关联对应 skill：

| 检查项 | 具体操作 | 关联 Skill |
|--------|----------|-----------|
| 芯片型号与数据手册一致性 | 通过 `kb-datasheet` 核对数据手册关键参数，确认 Flash/RAM 容量、最大频率、外设列表 | kb-datasheet, chip-architecture |
| 外设资源冲突 | 检查 DMA 通道/Timer/中断线是否被多模块占用 | dma-module, timer-module, interrupt-optimization |
| Flash 分区对齐 | 确认 Bootloader/APP/Storage 分区边界是否符合 MCU 扇区擦除粒度 | flash-module, bootloader-design |
| 引脚复用冲突 | 检查 GPIO 复用功能配置是否有冲突 | mcu-peripheral-registers, peripheral-driver |
| 时钟树可行性 | 确认 HSE/LSE/PLL 配置在 MCU 允许范围内，系统时钟不超限 | chip-architecture, stm32-hal-development |
| RTOS 资源 | 确认任务栈总和不超 SRAM、队列/信号量数量在可用范围内 | freertos-module, sram-module |
| 功耗约束 | 确认低功耗模式选择（Sleep/Stop/Standby）与唤醒源匹配 | lowpower-design |
| 中断延迟 | 确认中断优先级分组、嵌套深度、临界区长度 | interrupt-optimization, arm-interrupt-exception |
| 编码规范一致性 | 确认代码风格、命名规则、注释规范与项目现有标准一致 | coding-standards |
| Boot 启动链 | 确认从复位到 main 的完整路径：启动文件 → SystemInit → 跳转 | bootloader-design, arm-core-registers |

---

## Step 3: 开工前 4 张表

### 1. 现状确认表

> 先确认事实，再谈设计

| 维度 | 问题 | 状态 |
|------|------|:----:|
| 项目目标 | 当前要解决什么问题？ | 待确认 → 已确认 |
| 已有资产 | 有哪些现有代码、文档、配置？ | 待确认 → 已确认 |
| 依赖关系 | 是否依赖其他模块/系统/外部资源？ | 待确认 → 已确认 |
| 风险点 | 哪些地方可能出问题？ | 待确认 → 已确认 |

所有项「已确认」后进入下一步。

### 2. 代码约束清单

> 不能做什么和必须用什么

- 语言/框架版本约束
- 编码规范约束
- 性能/资源约束（RAM、Flash、响应时间）
- 兼容性约束（向后兼容、平台兼容）
- 安全约束（加密、访问控制、数据保护）
- 第三方依赖约束（许可、版本锁定）

### 3. 文件施工名单

> 先确认事实，再谈设计。列出所有涉及文件。

| 文件 | 操作 | 当前状态 | 目标状态 |
|------|:----:|:--------:|:--------:|
| path/to/file | 新增/修改/删除/移动 | 现有内容摘要 | 改后预期 |

所有路径真实存在后进入下一步。

### 4. 验收测试清单

> 怎么证明做对了？不通过时怎么排查？

| 验收项 | 验收方法 | 通过标准 | 失败排查步骤 |
|--------|----------|----------|-------------|
| 功能正确性 | 单元测试/集成测试 | 全部通过 | 查测试输出 → 查断言 → 查实现逻辑 |
| 行为不变 | diff review | 无意外变更 | git diff 逐行审查 |
| 文档同步 | 文件完整性检查 | 引用的文档路径都存在 | 逐个路径验证 |
| 构建通过 | 构建命令 | exit 0 | 查编译器输出 → 查错误首行 |

---

## Step 4: 输出施工包

### to-prd 产出

模板：

```markdown
## Problem Statement
## Solution
## User Stories
## Implementation Decisions
## Testing Decisions
## Out of Scope
## Further Notes
```

### to-issues 产出

每个 Issue 是垂直切片（tracer bullet），贯穿所有集成层。格式：

```markdown
## What to build
## Acceptance criteria
## Blocked by
```

---

## 循环与迭代

用户在任何 Step 可以要求「改方向」，此时触发回退：

```
用户：不对，换方向

Step 1 ─→ 重新追问，更新需求描述
  │
Step 2 ─→ 重新梳理约束，更新术语
  │
Step 3 ─→ 重新出 4 张表
  │
Step 4 ─→ 重新输出施工包
```

每轮迭代增量更新 CONTEXT.md 和 ADR，不删除历史决策。

---

## 嵌入式专项处理清单

需求对齐层自动检测以下嵌入式上下文并进行专项处理，每个检测项可调度对应 skill 获取深层知识。

所有映射集中在 [SKILL_REGISTRY.md](../../SKILL_REGISTRY.md) 统一管理，新增 skill 只需在该文件中添加一行。详见下方「Skill 注册机制」。

| 检测到 | 自动触发的操作 | 可调度 Skill |
|--------|---------------|-------------|
| MCU 型号 | 查找数据手册关键参数（Flash/RAM 大小、外设列表、电压范围） | kb-datasheet, chip-architecture |
| 外设名 | 确认资源独占性（该外设是否已被占用） | 对应外设 skill（adc-module/dma-module/timer-module 等） |
| 引脚号 | 检查引脚复用冲突 + 默认复用功能 | mcu-peripheral-registers, peripheral-driver |
| 协议名 + 速率 | 验证 MCU 外设是否支持该速率 | 对应协议 skill（i2c-bus/spi-bus/uart-module 等） |
| RTOS API | 确认版本兼容性和资源开销 | freertos-module, rtos-debug |
| Linker Script | 确认当前内存布局和可用区域 | linker-scatter, map-analyzer |
| 调试接口 | 确认调试器类型（JLink/ST-Link）和连接方式 | debug-gdb-openocd, flash-jlink |
| 构建系统 | 确认项目构建方式和工具链版本 | 对应构建 skill（build-cmake/build-iar/build-keil 等） |
| 安全需求 | 确认加密算法和密钥管理方式 | aes-module, rsa-module, crc-module, firmware-sign |
| OTA | 确认升级方案和分区策略 | ota-update-system, bootloader-design |

---

## Skill 注册机制

### 问题

嵌入式专项处理的检测项与 skill 映射当前硬编码在文档中。新增 skill 时（如添加 `modbus-module`），需要手动更新 4 处：
1. Step 1 grill-me 追问表
2. Step 2 grill-with-docs 检查项
3. 嵌入式专项处理清单
4. UBIQUITOUS_LANGUAGE.md

### 方案：SKILL_REGISTRY.md 统一注册

所有 skill 映射集中到项目根目录 `SKILL_REGISTRY.md`，各文档通过引用该文件获取映射。

### 注册格式

```markdown
# Skill Registry — 嵌入式 Skill 检测映射

每条记录定义：关键词检测 → 追问方向 → 关联 skill

## 外设类

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| ADC | 通道数/分辨率/采样率/触发方式 | adc-module |
| DAC | 通道数/分辨率/输出缓冲 | adc-module |

## 添加新 Skill

新增 skill 时在此文件添加一行映射即可。
```

### 使用方式

需求对齐层运行时读取 `SKILL_REGISTRY.md`：

1. 用户输入中包含 `关键词` → 触发对应追问
2. 追问中引用 `追问方向` 中的问题
3. 施工清单的验收项中引用 `关联 Skill` 的测试方法

### 新增 Skill 的流程

```
你：新增了一个 modbus-module skill
    │
    ▼
在 SKILL_REGISTRY.md 添加一行：
| Modbus | 波特率/奇偶校验/从站地址/功能码 | modbus-module |
    │
    ▼
需求对齐层自动生效：
- grill-me 问到 Modbus 时触发专项追问
- grill-with-docs 自动检查 Modbus 配置一致性
- 验收清单自动加入 Modbus 通信测试项
```

---

## 质量门禁汇总

| 门禁点 | 通过条件 |
|--------|----------|
| Step 1 → Step 2 | 用户确认"对，这就是我要的" |
| Step 2 → Step 3 | 无模糊术语；ADR 记录了该记录的所有决策 |
| Step 3 → Step 4 | 4 表全部用户确认；所有文件路径真实存在 |
| Step 4 → 编排层 | PRD 覆盖所有用户故事；Issue 可独立验证 |
| 编排层接收 | 施工包包含完整 4 表 + PRD + Issue 清单 |

---

## 使用的 Skills

| Step | Skill | 用途 |
|------|-------|------|
| 1 | grill-me | 需求追问，决策树遍历 |
| 2 | grill-with-docs | 对照文档挑战方案 |
| 2 | ubiquitous-language | 精炼领域术语 |
| 3 | —（直接产出） | 开工前 4 张表 |
| 4 | to-prd | 生成 PRD |
| 4 | to-issues | 生成垂直切片 Issue 清单 |
