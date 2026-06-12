## 用户环境
- 姓名：TNSH
- 时区：UTC+8 (Asia/Shanghai)
- 语言：中文（代码/寄存器/路径英文）
- OS：Windows
- Python：`C:\Users\zhang\AppData\Local\Programs\Python\Python312\{PYTHON_EXE}`

## 知识库检索六源管线 — 完整来源清单

### 管线顺序与权重
> 芯片厂商官网 > 本地 KB > GitHub 实战代码 > 技术博客 > 嵌入式论坛 > B站/YouTube视频教程

### Phase 1: 本地知识库
- CherryStudio 主 KB (SQLite, ~18863 chunks)
- Obsidian Vault (Markdown, ~363 chunks)
- imported_docs (外部导入)

### Phase 2: 芯片厂商官网文档
ST / Espressif / NXP / TI / Nordic / GD / WCH / 立创开源硬件(oshwhub.com)

### Phase 3: GitHub + Gitee 开源代码
- GitHub: 官方驱动/开源项目/Issues
- Gitee: 国产 MCU SDK 优先

### Phase 4a: 技术博客/社区文章 (中7+英2)
中文(7): CSDN / 知乎 / 博客园 / 掘金 / 开源中国 / 51CTO / 腾讯云开发者社区
英文(2): Hackaday / Medium

### Phase 4b: 嵌入式论坛 (中15+英5)
中文(15): 电子发烧友 / 21ic / 正点原子 / 野火 / 硬汉 / STM32社区 / ST中文 / EEWorld / 极术 / 100ask / RT-Thread / 立创开源 / 阿莫 / 51黑 / 好好搭搭
英文(5): ST Community / ESP32 Forum / EEVblog / Stack Overflow / Reddit r/embedded

### Phase 4c: B站 + YouTube 视频教程
中文: B站 (site:bilibili.com)
英文: YouTube (site:youtube.com)

### 已剔除的不可用来源（2026-05-26）
- Embedded.com — HTTP2 连接错误
- All About Circuits — HTTP 403 禁止访问
- EDN — HTTP2 连接错误
- Hackster.io — JS 渲染依赖，搜索结果受限

## Keil MDK 环境（已打通）
- **UV4.exe**: `G:\keil5\core\UV4\UV4.exe`
- **ARMCC**: ARM Compiler 5.06 update 7 (build 960)
- **ARMCLANG**: 可用
- **调试器**: J-Link V9 (S/N 69701612), 目标板 STM32F411CEUx 已连接
- **J-Link DLL**: V9.30 (2026-03-25)
- **STM32F4xx_DFP**: 3.1.0 已安装
- UV4 路径已持久化到 `~/.claude/.tool_config/paths.json`

## J-Link 软件环境（已验证通过）
- **JLink Commander**: `C:\Program Files\SEGGER\JLink\JLink.exe` (V9.30, 2026-03-25)
- **JLinkRTTLogger**: `C:\Program Files\SEGGER\JLink\JLinkRTTLogger.exe`
- **J-Link V9 硬件**: S/N 69701612, HW V9.70, FW 2021-05-07
- **Keil 旧版 Commander**: `G:\keil5\core\ARM\Segger\JLink.exe` (V8.16)
- **V9.30 不支持 `-version` 和 `-ListEmulatorsId` 参数**（从启动输出正则提取 S/N）
- **JLink + Keil 已加入系统 User PATH**（2026-05-29）：`C:\Program Files\SEGGER\JLink` + `G:\keil5\core\UV4`
- **system_health.py 内置 KNOWN_TOOL_PATHS fallback**：当 PATH 查找失败时自动搜索已知安装路径

## Ruby / Ceedling 测试环境（2026-05-29，已归档）
- Ruby 3.4.2 保留在 `C:\tools\ruby34\bin\ruby.exe`（未卸载，已不用于日常测试）
- Ceedling 1.0.1 + CMock 2.6.0 + Unity 2.6.1 备而不用
- **当前方案：minunit** — 30 行零依赖单头文件 + 内联 mock stub + gcc 编译

## minunit 单元测试方案（2026-05-29 启用）

### 测试框架
- **minunit.h**: 30 行零依赖，4 个宏: mu_assert, mu_assert_eq, mu_assert_true/false, mu_run, mu_done
- **Mock**: 手写 struct + stub 函数（替换 CMock）
- **编译**: `gcc -I src -I test test/*.c src/*.c -o test_runner && ./test_runner`

### 自动运行器
- **minunit_runner.py**: `doc-automation/scripts/minunit_runner.py`
  - 自动扫描 `test/test_*.c` + `src/*.c`，编译并运行
  - 自动向上搜索项目根（含 src/ + test/ 的目录）
  - 透传退出码和输出

### 演示项目
- `C:\Users\zhang\projects\throwtheswitch-demo`
  - test/minunit.h + test/test_led_controller.c + src/led_controller.c/h + src/gpio_hal.h
  - 6 个测试（正常/空指针/越界），全部通过

### Workflow 路由（2026-05-29 更新）
- `unit-test-pipeline` 的 `unit-test` step 原指向不存在的 `unit-test` skill
- 现改为指向 `doc-automation/scripts/minunit_runner.py`
- 3 个 resolve_script() 全部更新（shared.py, workflow_runner.py, dev_agent.py 通过 shared.py）
- 不依赖 build-system 参数（minunit 测试永远走 gcc）

## 已修复的路径问题
- **keil_builder.py KEIL_SEARCH_PATHS**: 增加了 G:\ 等驱动器搜索路径（原只有 C:\ D:\）
- **workflow_runner.py**: 添加 `resolve_keil_project()`, 自动从目录扫描 .uvprojx 文件
- **workflow_runner.py build_monitor_cmd()**: 修复 `--listen` → `--monitor` 参数名
- **keil_reg_reader.py**: JLink `mem` 命令字数计算（bytes vs words），修复乘以4

## Workflow v3.1.0 — 多 Agent 架构（2026-05-29 更新）

### 架构
- **6 Agent**: build-agent (3 pipelines), dev-agent (9 pipelines), pm-agent (5), verify-agent (3), release-agent (2), fix-agent (1) = 总计 22 条流水线
- **协调器**: `workflow_coordinator.py` — 路由调度 + 链式触发 + 环境探测
- **共享模块**: `shared.py` — WORKFLOWS、SCRIPT_LABELS、ResourceLock、WorkflowState、check_cross_skill_conflicts
- **动态扩展**: 任何 skill 可通过 `pipeline.json` 注册流水线，协调器自动发现

### 资源锁
- 基于 `os.mkdir()` 原子性的跨平台文件锁
- 类型: serial / jlink / project / flash / git
- 锁目录: `~/.workflow_locks/`
- 支持僵死锁自动清理

### 链式触发
- sprint-dev → sprint-wrap（dev-agent → pm-agent）
- fix-verify-commit → build-flash-monitor（fix-agent → build-agent）
- release-prep → release（release-agent 内部）

### 构建系统
- keil (build-keil / flash-keil)
- cmake (build-cmake / flash-openocd)
- platformio (build-platformio / flash-platformio)

### SOUL.md 修复（2026-05-30）
- `embedded-code-reviewer-framework` → `embedded-reviewer`（前者不存在，已合并入后者）
- 新增「工作流辅助」分类：brainstorming（需求对齐）、writing-plans（方案设计）、executing-plans（计划执行）
- 同步更新：CLAUDE.md ×2、embedded-skills-map SKILL.md + skill-mapping.md
- skill-mapping.md 统计更新：58→61 skills，新增工作流辅助3个分类

### 技能覆盖统计（2026-05-30）
- 嵌入式 skills 共计 60 个（含已启用 + 已禁用嵌入式相关；unit-test skill 已删除）
- 新增: **doc-automation** — 嵌入式文档自动化，含 6 个脚本，全部零外部依赖
- 新增: **workflow-guide v1.2.0** — 工作流体系导航与维护指南
- 新增: **pcb-analysis** — LCEDA Pro 原理图综合分析（BOM/电源树/引脚映射/网络拓扑/DRC），依赖 ai_eda WebSocket bridge 读取原理图
- 新增: **schematic-review** 流水线 — verify-agent 下第3条流水线，单步调用 pcb_analyzer.py analyze --all --json
- 分类：必备开发工具 20 | 开发板-ARM 14 | 常用模块 8 | 系统级设计 3 | 通信协议 6 | 知识管理 5 | 编码规范与代码质量 1 | 嵌入式项目文档与工作流 5 | 开发板-RISC-V 2 | 操作系统 2 | 中间件 1 | EDA/原理图分析 1

## 灵魂层同步规则（2026-05-29）
每次为 agent 添加新 skills 或修改 agent 重要内容后，必须同步检查：
1. **SOUL.md**（灵魂层）— 第1节 Skill 优先表和排查路线图是否需要更新
2. **FACT.md**（工作流/分发层）— 检查新内容是否影响工作流编排、分发链路、或需要记录为持久知识
这两条构成内容变更的最小闭合集，任何一条遗漏都视为不完整。

## 工作流关联检查规则（2026-05-29）
每次对与工作流（workflow）相关的内容进行增删改查操作时，必须同步检查工作流体系中的以下关联关系：
1. **embedded-skills-map** — 技能导航（分类表、推荐矩阵、关系图、技能映射参考）
2. **SOUL.md** — 技能优先表中的映射（第1节 Skill 优先）、排查路线图（第6节 通用排查路线图）
3. **workflow SKILL.md** — 流水线编排是否涉及该技能
4. **嵌入式技能地图 skill-mapping.md** — 分层架构图与完整映射表

## Claude Code settings.json 保护（2026-05-29）
agent-packager 安装到 Claude Code 时，`_install_to_claude_code()` 会写入 `~/.claude/settings.json`，**覆盖**其中已有的 env 配置（ANTHROPIC_BASE_URL、代理等）。
- **当前 Claude Code 使用 DeepSeek 反向代理**：`ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic`
- **代理**：`ALL_PROXY=socks5://127.0.0.1:7897` (clash-verge)
- 重新部署 agent 后要检查 settings.json 中的 env 段是否保留
- 备份位于 `settings.json.reinstall-backup-*`

## 新增 skill: skills-system-builder（2026-05-31）
- **skills-system-builder** — 技能系统搭建指南，供其他 Agent 理解、创建、优化本技能体系。覆盖目录结构、SKILL.md 标准模板、init→register 流程、内容变更同步检查清单。
- 分类：Agent 管理
- 同步：SOUL.md + CLAUDE.md ×2 已更新

## Skills 结构标准化（2026-05-31）
按照 can-debug 模板（场景 → 输入 → 依赖 → 步骤 → 错误 → 输出 → 边界 → 交接）对工具执行型 skills 进行结构统一：

### 前端修复（5 个 old skill）
- `embedded-debugger-framework` — 中文编码损坏修复 + 正文重写
- `embedded-learning-path-framework` — 中文编码损坏修复 + 正文重写
- `embedded-skills-map` — YAML frontmatter 补 `name:` 字段
- `doc-automation` — 添加完整 YAML frontmatter
- `pcb-analysis` — 添加完整 YAML frontmatter

### 结构重写（2 个核心 skill）
- `flash-keil` — 从仅有错误处理一节 → 完整 8 节模板
- `build-keil` — 从仅有错误处理一节 → 完整 8 节模板

### 补全缺失章节（11 个 skill）
补 `交界关系` + `输出约定` 到：`rtt-monitor`、`flash-jlink`、`rtos-debug`、`static-analysis`、`map-analyzer`、`option-bytes`、`gang-flash`、`firmware-sign`、`ota-package`

### 同步检查结果
- **SOUL.md**：技能名和能力未变，不须更新
- **embedded-skills-map**：引用仍然准确，不须更新
- **skill-mapping.md**：引用仍然准确，不须更新
- **CLAUDE.md 副本**：内容未变，不须同步
- **FACT.md**：本条目

### A 档修复（6 个工具执行型，2026-05-31）
补全到 8 节完整模板：
- `peripheral-driver` — 补 场景+依赖
- `doc-automation` — 从仅有依赖 → 完整 8 节模板
- `pcb-analysis` — 从仅有输出 → 完整 8 节模板
- `code-porting` — 补 场景/输入/依赖/步骤/错误/输出/边界/交接
- `knowledge-base-search` — 补 输入/依赖/步骤/错误/交接
- `coding-standards` — 补 场景/输入/输出/边界

### B 档修复（7 个知识参考型，2026-05-31）
补 YAML frontmatter `name:` 字段：
- `dma-module` `flash-module` `sram-module` `usb-module`
- `freertos-module` `fatfs-module` `motor-control`

### C 档修复（5 个系统设计型 + 2 个框架型，2026-05-31）
- `bootloader-design` — 补 场景/输入/边界/交接
- `ota-update-system` — 去重 场景/输入，补 边界/交接
- `lowpower-design` — 统一 边界定义 章节
- `watchdog-module` — 统一 边界定义 章节
- `stm32-spl-development` — 补 交接关系
- `embedded-architect` — 补 version 字段
- `embedded-reviewer` — 补 version 字段

### 新增 chip-architecture + 外设 skill 跨平台化（2026-05-31）
- **chip-architecture** — MCU 芯片架构与开发方式对比中央参考
  - ARM Cortex-M 全系列对比（M0/M0+/M3/M4/M7/M33）
  - STM32 各系列差异（F0/F1/F3/F4/F7/G0/G4/H5/H7/L0/L4/L5/U5 等）
  - ESP32 系列对比（LX6/LX7/RISC-V）
  - 国产替代对照（GD32/AT32/CH32）
  - HAL/SPL/寄存器/ESP-IDF/Arduino 等效操作映射表
- 外设 skill 跨平台化（已更新 6 个）
  - `uart-module` `i2c-bus` `spi-bus` `timer-module` `adc-module` `dma-module`
  - 每个 skill 尾部添加「平台差异」章节，引用 chip-architecture 详表
  - 覆盖 STM32 HAL / SPL / 寄存器 / ESP-IDF / Arduino 多平台
- 同步：SOUL.md + CLAUDE.md ×2 + embedded-skills-map + skill-mapping.md + FACT.md
- skill-mapping.md 统计更新：62 → 63 skills

### 新增 6 个通信层 skill（2026-06-01）
- `ble-module` — BLE 蓝牙低功耗（STM32WB/ESP32/nRF52 多平台）
- `wifi-module` — WiFi 无线通信（ESP-IDF/AT 模块/网络管理）
- `lora-module` — LoRa/LoRaWAN 远距离通信（SX1278/SX1262）
- `cellular-module` — 4G/NB-IoT 蜂窝通信（SIM7xxx/BC95/AT 指令）
- `gps-module` — GPS/北斗 GNSS 定位（NMEA/UBX/多星座）
- `mqtt-module` — MQTT 物联网协议（ESP-MQTT/paho/云平台）
- 同步：SOUL.md + CLAUDE.md ×2 + embedded-skills-map + skill-mapping.md + FACT.md
- skill-mapping.md 统计更新：63 → 69 skills，通信协议 6→12

### 新增 5 个中间件层 skill（2026-06-01）
- `aes-module` — AES 加密（ECB/CBC/GCM/硬件 CRYP/软件库）
- `rsa-module` — RSA 非对称加密（签名验签/mbedTLS/混合加密）
- `crc-module` — CRC 校验（查表法/硬件 CRC/CRC-16/32）
- `ymodem-module` — Ymodem 串口文件传输（Bootloader OTA）
- `lvgl-module` — LVGL 嵌入式 GUI（移植/控件/中文/内存优化）
- 同步：SOUL.md + CLAUDE.md ×2 + embedded-skills-map + skill-mapping.md + FACT.md
- skill-mapping.md 统计更新：69 → 74 skills

### 新增 DSP + FFT 中间件（2026-06-01）
- `dsp-module` — 嵌入式数字信号处理（CMSIS-DSP FIR/IIR/PID/矩阵/统计）
- `fft-module` — FFT 频谱分析（arm_rfft/窗函数/Goertzel/性能基准）
- 同步：SOUL.md + CLAUDE.md ×2 + embedded-skills-map + skill-mapping.md + FACT.md
- skill-mapping.md 统计更新：74 → 76 skills

### 新增 OTA + 云接入流水线（2026-06-01）
- **ota-release** — release-agent 下新流水线：编译→签名→AES加密→OTA打包→Ymodem/HTTP推送
  - 新增步骤：`aes-encrypt`、`push-ota`
- **cloud-access** — dev-agent 下新流水线：WiFi配网→MQTT连接→云平台数据验证
  - 新增步骤：`wifi-config`、`mqtt-connect`、`cloud-verify`
- 同步：workflow SKILL.md（架构图更新）+ shared.py（WORKFLOWS + STEP_LABELS + STEP_ICONS）
- 步骤名称已在 STEP_LABELS 中注册，SCRIPT_MAP 无新增（执行时由 Agent 触发 skill）
- 流水线统计：21 → 23 条

### Phase 5: 技能版本管理流水线（2026-06-01）
- shared.py: WORKFLOWS 新增 `skill-maintenance` 流水线（detect→checkpoint），步骤 `skill-check` + `skill-checkpoint`
- workflow_coordinator.py: AGENT_MAP 注册
- auto_checkpoint.py: Windows 定时任务每 10 分钟执行一次
- workflow SKILL.md: 架构图 + Agent 表更新
- 流水线统计：23 → 24 条

### Phase 1: Agent 优先级 + 优先级继承（2026-06-01）
- shared.py: 新增 AGENT_PRIORITY 优先级表、ResourceLock 支持 agent_priority 参数、优先级继承协议（inherit.json 标记；高优等锁时提升低优持有者有效优先级）
- 所有 Agent 脚本：传入 agent_priority 参数持锁
- workflow SKILL.md: 新增优先级说明 + 继承协议 + 版本 v3.2.0
- workflow-guide SKILL.md: 版本 v1.3.0

### Phase 2: 消息队列（2026-06-01）
- shared.py: 新增 `AgentQueue` 文件级消息队列（send/receive/receive_filtered/purge/list），`AGENT_QUEUES` 预定义 6 个队列，`AGENT_QUEUE_ROUTES` 队列→Agent 路由表
- 链式触发增强：`trigger_pipeline_via_queue()` 通过消息队列异步触发，`consume_queue()` 队列消费循环
- workflow_coordinator.py: 新增 `--queue`/`--queue-send`/`--queue-list`/`--queue-purge` 四个队列管理命令
- workflow SKILL.md: 新增消息队列章节
- 流水线统计不变（仍为 23 条），Phase 2 100% 编译通过

### Phase 3: 中断抢占（2026-06-01）
- shared.py: 新增 `AgentInterrupt` 类（send/check/ack/list/clear_all/check_at_step），`AGENT_SIGNAL_DIR` 信号目录
- 全部 6 个 Agent 脚本：步骤循环中注入中断检查（`check_at_step`），高优 Agent 可抢占低优流水线
- workflow_coordinator.py: 新增 `--interrupt`/`--interrupt-list`/`--interrupt-clear` 命令
- workflow SKILL.md: 新增中断系统章节
- Phase 3 100% 编译通过

### Phase 4: 看门狗（2026-06-01）
- shared.py: ResourceLock 新增 `wdt_timeout` 参数、`watchdog_tick()` 喂狗方法、`watchdog_scan_all()` 全局扫描回收；__exit__ 自动清理 wdt.json
- workflow_coordinator.py: 新增 `--watchdog`（守护进程模式，每 15s 扫描）/ `--watchdog-scan`（手动扫描回收）
- 集成测试 6/6 全部通过（优先级/锁/队列/中断/看门狗）

### 全量技能结构统计（2026-06-01）
- 工具执行型 25 个：全部 8/8 模板完整
- 知识参考型 24 个：frontmatter 完整 + 最小章节齐备
- 系统设计型 7 个：场景/边界/交接 齐备
- 框架型 2 个：frontmatter 完整，保留纯方法论风格
- 通信协议专用 6 个：跨平台通信协议指南

## 新增 skill: cmbacktrace-debug（2026-06-01）
- **cmbacktrace-debug** — CmBacktrace (Cortex Microcontroller Backtrace) ARM Cortex-M 故障自动追踪库 skill
  - 覆盖：移植步骤、cmb_cfg.h 配置、4 个核心 API（init/assert/fault/call_stack）、addr2line 调用栈解析、HardFault 自动诊断（DIVBYZERO/UNALIGNED/IMPRECISERR 等）
  - 平台：裸机/FreeRTOS/RT-Thread/UCOS，Cortex-M0/M3/M4/M7，Keil/IAR/GCC
  - 来源：https://github.com/armink/CmBacktrace（MIT 许可，v1.4.1，2K+ Stars）
  - B站视频：https://www.bilibili.com/video/BV1LB4y1Q78a 等 3 集
  - 同步：SOUL.md（技能表 + 排查路线图 HardFault 路径）+ CLAUDE.md ×2 + embedded-skills-map（SKILL.md + skill-mapping.md）
  - skill-mapping.md 统计更新：76 → 77 skills

## 打包规则（2026-06-02）
- **只打包嵌入式工作流相关 skills**，排除非嵌入式 skills：
  - 排除列表：`find-skills` `skill-creator` `canvas-design` `docx` `xlsx` `pptx` `pdf` `obsidian-bases` `obsidian-cli` `obsidian-markdown` `obsidian-mermaid` `obsidian-viz` `mermaid-visualizer` `conversiontools` `paper-orchestra` `academic-search` `mck-ppt-design` `darwin-skill` `huashu-nuwa` `nuwa-skill` `office-mcp` `document-polisher` `theme-factory` `notebooklm` `notebooklm-enterprise-api` `learning-flow` `round-table-analysis` `simplify` `less-permission-prompts` `claude-api` `init` `review` `security-review` `keybindings-help` `update-config` `loop` `schedule` `st-stm32`
  - 命令：`python agent_packager.py export ... --exclude-skills <list>`
- 仅打包 `enabled=true` 的嵌入式 skills（参考 `skill-mapping.md` 中的分类）
- 版本号：Chip Agent 使用 `3.x.0` 格式

## system_health.py 修复（2026-05-30）
- **shared/ 目录跳过**：`Skills/shared/` 含 `tool_config.py`，是跨 skill 共享库而非 skill，已在 `check_skills_integrity()` 中加 `d.name == "shared"` 跳过
- **J-Link 检测修复**：JLink.exe 是 GUI 应用（运行无参数时打开窗口而非输出版本），改为 `is_gui=True` 走文件存在性检查路径，分数从 76% → 100%

## 五层 Agent 系统 + ECC 集成完成（2026-06-12）

### 系统架构
- **五层核心**：需求对齐层 → 安全层 → 编排层 → 记忆层 → 工具层/Ops 层
- **ECC 集成**：Homunculus 持续学习 + AgentShield 安全扫描（102 条规则）
- **领域配置**：embedded（嵌入式）+ web（Web 开发）+ data（数据处理）
- **专用 Agent**：embedded-expert / code-reviewer / test-runner / devops
- **测试体系**：217 项测试全部通过（169 mock + 48 standalone）

### 模型配置
- **默认**：mimo-v2.5（国内直连，无需代理）
- **CherryIn**：Claude 4.6 + DeepSeek/GLM/mimo 混搭（需要 Claude 能力时）
- **DeepSeek**：deepseek-v4-pro（备用）

### 关键文件
- `~/.claude/SOUL.md` — Chip 人格定义（含五层系统架构）
- `~/.claude/AGENTS.md` — 行为守则（含 Agent/安全层/Homunculus 规范）
- `~/.claude/CLAUDE.md` — 系统架构文档（链式触发/WorkflowState/action_items）
- `~/.claude/agents/` — 4 个专用 Agent 定义
- `~/.claude/workflows/` — 9 个核心 Workflow + 2 个领域配置
- `~/.claude/homunculus/` — 持续学习系统（6 个人物本能 + 4 个进化技能 + 2 个项目级本能）
- `~/.claude/rules/` — 4 个领域规则（security/workflow/embedded/privacy）