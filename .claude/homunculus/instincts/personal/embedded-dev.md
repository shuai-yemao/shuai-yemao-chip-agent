---
slug: embedded-dev
trigger: "当处理嵌入式开发任务（STM32、外设驱动、固件）时"
summary: "用户专注 STM32 系列 MCU 开发，偏好 HAL 库，常用 I2C/SPI/UART 外设协议"
domain: embedded
scope: personal
confidence: 0.85
tags: [stm32, embedded, hal, i2c, spi, uart, firmware]
created: 2026-06-12
source: history.sessions(12 patterns)
---

**Why:** 用户在 12 个会话中涉及嵌入式开发，核心平台为 STM32。

**观察模式:**
- 常用 STM32 HAL 库开发外设驱动
- I2C、SPI、UART 是最常用的通信协议
- 使用 OpenOCD/JLink 烧录固件
- 偏好结合技能包实现模块化开发

**How to apply:**
- 默认使用嵌入式技能包（i2c-bus, spi-bus, uart-module 等）
- 烧录推荐 OpenOCD 或 JLink
- 提供 HAL 库参考实现
