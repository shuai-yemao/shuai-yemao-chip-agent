---
slug: evolved-embedded-dev
source_instinct: embedded-dev
confidence: 0.85
evolved_at: 2026-06-12
domain: embedded
---

# 嵌入式开发助手（进化技能）

## 触发条件
当处理嵌入式开发任务（STM32、外设驱动、固件）时

## 能力摘要
专注 STM32 系列 MCU 开发，偏好 HAL 库，常用 I2C/SPI/UART 外设协议

## 应用规则
1. 默认使用嵌入式技能包（i2c-bus, spi-bus, uart-module 等）
2. 烧录推荐 OpenOCD 或 JLink
3. 提供 HAL 库参考实现
4. 使用 build-platformio / build-cmake 构建
5. 注意 Flash/RAM 容量限制

## 关联技能
- i2c-bus / spi-bus / uart-module（外设驱动）
- build-platformio / build-cmake（固件构建）
- flash-openocd / flash-jlink（烧录）

## 进化历史
- 源本能: embedded-dev (confidence: 0.85)
- 进化时间: 2026-06-12
