# Skill Registry

> 统一的嵌入式 Skill 检测映射表。新增 skill 时在此添加一行即可生效。

## MCU 架构

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| ARM Cortex (M0/M3/M4/M7) | 内核版本、FPU、中断优先级位数 | arm-core-registers, arm-interrupt-exception, arm-memory-architecture |
| STM32 (F1/F4/H7/G0 等) | 具体型号、封装、片内外设列表、Flash/RAM 容量 | stm32-hal-development, stm32-spl-development |
| 芯片架构 | 内核、总线矩阵、存储器映射 | chip-architecture |
| 外设寄存器 | 基地址、复位值、位定义 | mcu-peripheral-registers |

## 外设驱动

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| ADC | 通道数、分辨率（12/16bit）、采样率、触发方式、DMA | adc-module |
| DAC | 通道数、分辨率、输出缓冲、波形生成模式 | adc-module |
| DMA | 通道分配、优先级、传输方向、数据宽度、循环模式 | dma-module |
| Timer / PWM / IC / OC | 定时器编号、通道数、时钟源、预分频、自动重装值 | timer-module |
| Watchdog / IWDG / WWDG | 独立窗口、超时时间、窗口值、中断或复位 | watchdog-module |
| I²C / I2C | 速率（标准/快速/高速）、主从模式、多设备地址 | i2c-bus |
| SPI | 极性和相位模式、数据帧格式（MSB/LSB）、时钟分频 | spi-bus |
| UART / USART | 波特率、数据位、停止位、校验位、流控 | uart-module |
| USB | 速度（FS/HS）、Device/Host/OTG、端点、类 | usb-module |
| CAN / CAN-FD | 波特率、滤波器、标准帧/扩展帧 | can-debug |
| 电机 / BLDC / PMSM | 电机类型、霍尔/编码器反馈、FOC/方波控制 | motor-control |
| DSP | 采样点数、窗函数、实部/复数 FFT | dsp-module, fft-module |

## 无线通信

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| BLE / Bluetooth | Central/Peripheral、服务 UUID、MTU、功耗 | ble-module |
| WiFi | 802.11 b/g/n、Station/AP、TCP/UDP | wifi-module |
| LoRa | 频率（CN470/EU868/US915）、扩频因子、带宽 | lora-module |
| GPS | NMEA 协议、解析率、定位精度、冷/热启动 | gps-module |
| 4G / NB-IoT / Cellular | 模块型号、AT 指令集、APN | cellular-module |
| MQTT | QoS、Keep Alive、遗嘱消息、TLS | mqtt-module |

## RTOS

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| FreeRTOS 任务 | 任务数、堆栈大小、优先级、阻塞超时 | freertos-module |
| FreeRTOS 队列 | 队列长度、消息大小、超时等待 | freertos-module |
| 信号量 / 互斥量 | 二值/计数/递归互斥、优先级反转 | freertos-module |
| RTOS 调试 | 栈使用率、上下文切换、中断延迟 | rtos-debug |

## 存储与文件系统

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| FATFS / FatFS | 扇区大小、长文件名、编码页、多卷 | fatfs-module |
| SFUD / SPI Flash | Flash 型号、容量、擦除粒度 | sfud-module |
| SRAM | 容量、地址范围、等待周期 | sram-module |
| Flash 分区 | 分区表布局、擦写寿命、磨损均衡 | flash-module |
| YMODEM / XMODEM | 传输协议、包大小、校验方式 | ymodem-module |

## 构建与工具链

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| CMake | 工具链文件、编译选项、链接脚本路径 | build-cmake |
| IAR | IDE 版本、芯片支持包、工程文件（.ewp） | build-iar |
| Keil / MDK | IDE 版本、芯片支持包、工程文件（.uvprojx） | build-keil |
| ESP-IDF | ESP-IDF 版本、芯片目标、分区表 | build-idf |
| PlatformIO | 开发板配置、lib_deps、环境管理 | build-platformio |
| Linker Script / .ld / .icf | 内存区域定义、段分布、对齐要求 | linker-scatter |

## 烧录与调试

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| JLink / J-Flash | 调试器型号、目标芯片、JTAG/SWD、速率 | flash-jlink |
| OpenOCD | 配置文件（.cfg）、接口、目标芯片 | flash-openocd, debug-gdb-openocd |
| ST-Link | 目标芯片、SWD 速率、固件版本 | flash-module |
| ESP 烧录 | 芯片型号、Flash 大小、烧录地址 | flash-idf |
| Keil 烧录 | 算法文件、目标芯片 | flash-keil |
| PlatformIO 烧录 | 开发板、环境、烧录方式 | flash-platformio |
| 批量烧录 / 产线烧录 | 烧录器型号、工位数、固件加密 | gang-flash |
| GDB | 目标芯片、连接方式、调试命令 | debug-gdb-openocd |
| RTT / SEGGER RTT | 通道配置、上行/下行缓冲区大小 | segger-rtt-module, rtt-monitor |
| 串口监视器 / Serial | 波特率、数据格式、日志解析 | serial-monitor |
| CmBacktrace | 异常类型、栈回溯、寄存器转储 | cmbacktrace-debug |
| Map 文件 / .map | 代码大小分布、未使用段、栈使用量 | map-analyzer |
| 静态分析 / Static Analysis | 检查规则、报告格式、误报处理 | static-analysis |

## 安全与 OTA

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| AES | 密钥长度（128/192/256）、模式（ECB/CBC/GCM） | aes-module |
| RSA | 密钥长度、填充方式、签名/加密 | rsa-module |
| CRC | 多项式、初始值、校验宽度 | crc-module |
| 固件签名 | 签名算法、公钥存储、验签流程 | firmware-sign |
| OTA 升级 | 双区/单区、差分/全量、回滚策略 | ota-update-system, ota-package |
| Bootloader | 启动流程、跳转条件、固件校验、加密启动 | bootloader-design |

## 调试与分析工具

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| elog / EasyLogger | 日志级别、输出后端、过滤配置 | elog-module |
| VISA / USBTMC | 仪器控制、SCPI 命令、波形捕获 | visa-debug |
| Modbus | 协议类型（RTU/ASCII/TCP）、从站地址、功能码 | modbus-debug |
| PCB 分析 | 叠层、阻抗、信号完整性 | pcb-analysis |

## 低功耗

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| 低功耗 / Sleep / Stop / Standby | 唤醒源、唤醒时间、功耗指标 | lowpower-design |
| RTC | 时钟源、闹钟、唤醒周期、备份寄存器 | timer-module (RTC) |

## 通用工程

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| 编码规范 | 命名规则、文件结构、注释规范 | coding-standards |
| 代码移植 | 芯片平台差异、编译器差异、HAL 适配 | code-porting |
| 外设驱动设计 | 接口抽象、分层设计、可移植性 | peripheral-driver |
| 中断优化 | 优先级分组、嵌套深度、临界区 | interrupt-optimization |

## 知识管理

| 关键词 | 追问方向 | 关联 Skill |
|--------|----------|-----------|
| 数据手册 / Datasheet | 芯片规格、电气参数、封装信息 | kb-datasheet |
| 知识库导入 | 文档格式、标签分类、全文检索 | kb-import, kb-record |
| 知识验证 | 信息准确性、来源追溯、更新同步 | kb-verify |
| 知识库搜索 | 关键词、向量检索、语义匹配 | knowledge-base-search |
