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

当检测到嵌入式领域关键词时，自动触发专项追问。每个领域关联对应的可用 skill：

#### MCU 架构类

| 关键词 | 专项追问 | 关联 Skill |
|--------|----------|-----------|
| ARM Cortex (M0/M3/M4/M7) | 确认内核版本 + FPU + 中断优先级位数 | arm-core-registers, arm-interrupt-exception, arm-memory-architecture |
| STM32 (F1/F4/H7/G0 等系列) | 确认具体型号 + 封装 + 片内外设列表 | stm32-hal-development, stm32-spl-development |
| 芯片架构 | 确认内核、总线矩阵、存储器映射 | chip-architecture, mcu-peripheral-registers |
| 外设寄存器 | 确认基地址、复位值、位定义 | mcu-peripheral-registers |

#### 外设驱动类

| 关键词 | 专项追问 | 关联 Skill |
|--------|----------|-----------|
| ADC | 通道数、分辨率（12/16bit）、采样率、触发方式、DMA 搭配 | adc-module |
| DAC | 通道数、分辨率、输出缓冲、波形生成模式 | adc-module |
| DMA | 通道分配、优先级、传输方向、数据宽度、循环模式 | dma-module |
| Timer (PWM/IC/OC) | 定时器编号、通道数、时钟源、预分频、自动重装值 | timer-module |
| Watchdog (IWDG/WWDG) | 独立窗口？超时时间、窗口值、中断或复位？ | watchdog-module |
| I²C | 速率（标准/快速/高速）、主从模式、多设备地址、10-bit 寻址 | i2c-bus |
| SPI | 极性和相位模式、数据帧格式（MSB/LSB）、时钟分频 | spi-bus |
| UART/USART | 波特率、数据位、停止位、校验位、流控（RTS/CTS） | uart-module |
| USB (Device/Host/OTG) | 速度（FS/HS）、端点数量、类（CDC/HID/MSC） | usb-module |
| CAN/CAN-FD | 波特率、滤波器配置、标准帧/扩展帧 | can-debug |
| 电机 (BLDC/PMSM/Stepper) | 电机类型、霍尔/编码器反馈、FOC/方波控制 | motor-control |
| DSP/FFT | 采样点数、窗函数、实部/复数 FFT、精度要求 | dsp-module, fft-module |

#### 无线通信类

| 关键词 | 专项追问 | 关联 Skill |
|--------|----------|-----------|
| BLE | 角色（Central/Peripheral）、服务 UUID、MTU 大小、功耗要求 | ble-module |
| WiFi | 协议（802.11 b/g/n）、Station/AP 模式、TCP/UDP | wifi-module |
| LoRa | 频率（CN470/EU868/US915）、扩频因子、带宽、功率 | lora-module |
| GPS | NMEA 协议解析率、定位精度、冷/热启动时间 | gps-module |
| Cellular (4G/NB-IoT) | 模块型号、AT 指令集、APN 配置 | cellular-module |
| MQTT | QoS 等级、Keep Alive、遗嘱消息、TLS | mqtt-module |

#### RTOS 类

| 关键词 | 专项追问 | 关联 Skill |
|--------|----------|-----------|
| FreeRTOS 任务 | 任务数、堆栈大小、优先级分配、阻塞超时 | freertos-module |
| FreeRTOS 队列 | 队列长度、消息大小、超时等待 | freertos-module |
| FreeRTOS 信号量/互斥量 | 二值/计数、递归互斥、优先级反转处理 | freertos-module |
| RTOS 调试 | 任务栈使用率、上下文切换次数、中断延迟 | rtos-debug |

#### 存储与文件系统类

| 关键词 | 专项追问 | 关联 Skill |
|--------|----------|-----------|
| FATFS | 扇区大小、长文件名、编码页、多卷 | fatfs-module |
| SFUD (Flash 存储) | SPI Flash 型号、容量、擦除粒度 | sfud-module |
| SRAM (内部/外部) | 容量、地址范围、等待周期 | sram-module |
| Flash 分区 | 分区表布局、擦写寿命、磨损均衡 | flash-module |

#### 构建/烧录/调试类

| 关键词 | 专项追问 | 关联 Skill |
|--------|----------|-----------|
| CMake | 工具链文件、编译选项、链接脚本路径 | build-cmake |
| IAR/Keil/IDF | IDE 版本、芯片支持包、工程文件格式 | build-iar, build-keil, build-idf |
| PlatformIO | 开发板配置、库依赖、环境管理 | build-platformio |
| JLink/OpenOCD | 调试器型号、目标芯片、接口（JTAG/SWD）、速率 | flash-jlink, debug-gdb-openocd |
| Linker Script (.ld/.icf) | 内存区域定义、段分布、对齐要求 | linker-scatter |
| Map 文件 | 代码大小分布、未使用段、栈使用量 | map-analyzer |
| Option Bytes | 读保护等级、BOOT 配置、硬件默认设置 | option-bytes |

#### 安全与 OTA 类

| 关键词 | 专项追问 | 关联 Skill |
|--------|----------|-----------|
| AES/RSA/CRC | 密钥长度、模式（ECB/CBC/GCM）、硬件加速 | aes-module, rsa-module, crc-module |
| 固件签名 | 签名算法、公钥存储、验签流程 | firmware-sign |
| OTA 升级 | 双区/单区、差分/全量、回滚策略 | ota-update-system, ota-package |
| Bootloader | 启动流程、跳转条件、固件校验 | bootloader-design |

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

需求对齐层自动检测以下嵌入式上下文并进行专项处理，每个检测项可调度对应 skill 获取深层知识：

| 检测到 | 自动触发的操作 | 可调度 Skill |
|--------|---------------|-------------|
| MCU 型号 | 查找数据手册关键参数（Flash/RAM 大小、外设列表、电压范围） | kb-datasheet, chip-architecture |
| 外设外设名 | 确认资源独占性（该外设是否已被占用） | 对应外设 skill（adc-module/dma-module/timer-module 等） |
| 引脚号 | 检查引脚复用冲突 + 默认复用功能 | mcu-peripheral-registers, peripheral-driver |
| 协议名 + 速率 | 验证 MCU 外设是否支持该速率 | 对应协议 skill（i2c-bus/spi-bus/uart-module 等） |
| RTOS API | 确认版本兼容性和资源开销 | freertos-module, rtos-debug |
| Linker Script | 确认当前内存布局和可用区域 | linker-scatter, map-analyzer |
| 调试接口 | 确认调试器类型（JLink/ST-Link）和连接方式 | debug-gdb-openocd, flash-jlink |
| 构建系统 | 确认项目构建方式和工具链版本 | 对应构建 skill（build-cmake/build-iar/build-keil 等） |
| 安全需求 | 确认加密算法和密钥管理方式 | aes-module, rsa-module, crc-module, firmware-sign |
| OTA | 确认升级方案和分区策略 | ota-update-system, bootloader-design |

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
