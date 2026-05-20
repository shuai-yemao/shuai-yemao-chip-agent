# STM32 SPL → HAL Migration Plan: Cyberry Potter Electromagic Wand

## Context
This project is a gesture-recognition "magic wand" using STM32F103 + MPU6050 IMU + CNN (NNoM). It currently uses the deprecated Standard Peripheral Library (SPL) with MDK-ARM RTE components. The goal is to migrate all code to STM32CubeMX HAL library, with cleaner code style (no comments, simpler patterns, minimalist headers).

## Key Decisions
- **Software I2C**: Keep bit-banged I2C1 on PB6/PB7 for MPU6050 (timing-critical for DMP)
- **Dead code**: Remove unused IIC2 (conflicts with USART3 pins) and unused SPI1
- **Comments**: Remove all existing garbled Chinese comments; new code is self-documenting
- **CubeMX**: Generate into existing directory structure; keep minimal HAL config files
- **Architecture**: Each peripheral gets a clean `_Init()` function with HAL; legacy non-HAL code is segregated

## Peripheral Pin Mapping (Verified from Schematic/Code)

| Function | Pin | HAL Equivalent |
|----------|-----|----------------|
| LED | PA1 | `HAL_GPIO_WritePin(GPIOA, GPIO_PIN_1, ...)` |
| Laser | PA2 | `HAL_GPIO_WritePin(GPIOA, GPIO_PIN_2, ...)` |
| Button (EXTI0) | PA0 | `HAL_GPIO_ReadPin` + EXTI IRQ |
| MPU6050 INT (EXTI5) | PB5 | EXTI IRQ |
| IR/RF RX (EXTI7) | PA7 | EXTI IRQ |
| Software I2C1 SCL | PB6 | `HAL_GPIO_WritePin` / `HAL_GPIO_ReadPin` |
| Software I2C1 SDA | PB7 | `HAL_GPIO_WritePin` / `HAL_GPIO_ReadPin` |
| SPI2 NSS (soft) | PB12 | `HAL_GPIO_WritePin` |
| SPI2 SCK | PB13 | HAL_SPI |
| SPI2 MISO | PB14 | HAL_SPI |
| SPI2 MOSI | PB15 | HAL_SPI |
| USART1 TX/RX | PA9/PA10 | HAL_UART |
| USART3 TX/RX | PB10/PB11 | HAL_UART |
| ADC1_IN9 | PB1 | HAL_ADC |
| IR PWM (TIM3_CH1) | PA6 | HAL_TIM_PWM |
| TIM2 (signal timing) | - | HAL_TIM_Base |
| TIM4 (button timing) | - | HAL_TIM_Base |

## Phase 1: Foundation (headers, config, Delay, LED)

### 1.1 `config.h`
- Replace `#include "stm32f10x.h"` with `#include "stm32f1xx_hal.h"`
- Remove unused `#include <string.h>`, `<stdlib.h>` (only included 1-2 places)
- Keep all SYSTEM_FREQUENCY, MODULE_LIM, W25Q64, CNN defines
- Keep `SERIAL_DEBUG` define

### 1.2 `Delay.h` / `Delay.c`
- Replace SysTick direct register access with DWT cycle counter for `Delay_us()`
- `Delay_ms()` uses `HAL_Delay()` for delays >= 1ms, DWT for sub-ms
- Remove comments

### 1.3 `LED.h` / `LED.c`
- Replace `RCC_APB2PeriphClockCmd` → `__HAL_RCC_GPIOA_CLK_ENABLE()`
- Replace `GPIO_InitTypeDef` + `GPIO_Init()` → `GPIO_InitTypeDef` + `HAL_GPIO_Init()`
- Replace `GPIO_WriteBit()` macros → inline `HAL_GPIO_WritePin()`
- Remove all Chinese comments

## Phase 2: Communication Peripherals (SPI, USART)

### 2.1 `SPI.h` / `SPI.c`
- Remove SPI1 entirely (unused)
- Create `SPI2_HandleTypeDef hspi2` 
- `SPI2_Init()`: Use `HAL_SPI_Init()`, configure via CubeMX-compatible init struct
- `SPI2_SwapByte()`: Use `HAL_SPI_TransmitReceive(&hspi2, &tx, &rx, 1, HAL_MAX_DELAY)`
- `SPI2_Start()`/`SPI2_Stop()`: Use `HAL_GPIO_WritePin` for software NSS

### 2.2 `USART.h` / `USART.c`
- Create `UART_HandleTypeDef huart1`, `huart3`
- `USART1_Init()`: Use `HAL_UART_Init()`, configure NVIC via `HAL_NVIC_SetPriority()`
- `USART3_Init()`: Same pattern
- `USART3_WriteByte()`: Use `HAL_UART_Transmit(&huart3, &byte, 1, HAL_MAX_DELAY)`
- `fputc()` redirect: Write to `huart1` DR directly (keep register access for printf performance) or use `HAL_UART_Transmit`
- Remove Chinese comments

## Phase 3: Sensors & Input (ADC, button, IIC, MPU6050, IMU)

### 3.1 `ADC.h` / `ADC.c`
- Create `ADC_HandleTypeDef hadc1`
- `ADC_PB1_Init()`: Use `HAL_ADC_Init()`, `HAL_ADC_ConfigChannel()`
- `ADC_PB1_GetValue()` (static): `HAL_ADC_Start()` + `HAL_ADC_PollForConversion()` + `HAL_ADC_GetValue()`
- `ADC1_Deinit()`: `HAL_ADC_DeInit()`
- `ADC_PB1_GetAvg()`: Same logic, just calls updated `ADC_PB1_GetValue()`
- `ADC_GetValue()` (in CyberryPotter.c): Same pattern

### 3.2 `button.h` / `button.c`
- Replace `RCC_APB2PeriphClockCmd` → `__HAL_RCC_GPIOA_CLK_ENABLE()`
- Replace `RCC_APB1PeriphClockCmd` → `__HAL_RCC_TIM4_CLK_ENABLE()`
- Replace `GPIO_Init` → `HAL_GPIO_Init()`
- Replace `EXTI_Init` → `HAL_EXTI` (or direct EXTI config matching HAL style)
- Replace `TIM_TimeBaseInit` → `HAL_TIM_Base_Init(&htim4)`
- Replace `TIM_Cmd` → `HAL_TIM_Base_Start_IT` / `HAL_TIM_Base_Stop_IT`
- Replace `TIM_GetITStatus`/`TIM_ClearITPendingBit` → `__HAL_TIM_GET_FLAG`/`__HAL_TIM_CLEAR_FLAG`
- Rename IRQ handlers to HAL naming convention: `TIM4_IRQHandler` → keep same name (HAL compatible)
- Button EXTI: Replace `EXTI_GetITStatus`/`EXTI_ClearITPendingBit` → `__HAL_GPIO_EXTI_GET_IT`/`__HAL_GPIO_EXTI_CLEAR_IT`

### 3.3 `IIC.h` / `IIC.c`
- Keep software I2C bit-bang approach
- Replace `RCC_APB2PeriphClockCmd` → `__HAL_RCC_GPIOB_CLK_ENABLE()`
- Replace `GPIO_InitTypeDef` + `GPIO_Init()` (SPL) → `GPIO_InitTypeDef` + `HAL_GPIO_Init()`
- Replace `GPIO_WriteBit(GPIOB, GPIO_Pin_x, (BitAction)BitVal)` → `HAL_GPIO_WritePin(GPIOB, GPIO_Pin_x, BitVal ? GPIO_PIN_SET : GPIO_PIN_RESET)`
- Replace `GPIO_ReadInputDataBit()` → `HAL_GPIO_ReadPin()`
- Remove IIC2 entirely (dead code, pin conflict with USART3)
- Simplify: merge IIC1 write/read functions, remove redundant static wrappers

### 3.4 `MPU6050.h` / `MPU6050.c`
- Replace `RCC_APB2PeriphClockCmd` → `__HAL_RCC_GPIOB_CLK_ENABLE()`
- Replace `RCC_APB2Periph_AFIO` → `__HAL_RCC_AFIO_CLK_ENABLE()`
- Replace `GPIO_Init` → `HAL_GPIO_Init()`
- Replace `GPIO_EXTILineConfig` → keep (AFIO remap) or remove if not needed on this package
- Replace `EXTI_Init` → HAL-style EXTI config
- Replace `NVIC_Init` → `HAL_NVIC_SetPriority()` + `HAL_NVIC_EnableIRQ()`
- `INT_STOP`/`INT_START` macros: replace `EXTI->IMR` direct access with `HAL_NVIC_DisableIRQ(EXTI9_5_IRQn)` / `HAL_NVIC_EnableIRQ(EXTI9_5_IRQn)` — BUT note this disables ALL EXTI5-9 IRQs. For Line5-only: keep `EXTI->IMR &= ~EXTI_Line5` / `|= EXTI_Line5`.

### 3.5 `IMU.h` / `IMU.c`
- Already mostly platform-independent (uses IIC1_read/write)
- No direct SPL calls except `EXTI_Line0` manipulation in `IMU_Sample_Start/Stop` → use HAL GPIO EXTI API

## Phase 4: Application Layer (W25Q64, CyberryPotter, main)

### 4.1 `W25Q64.h` / `W25Q64.c`
- Replace `SPI2_SwapByte()` calls → `HAL_SPI_TransmitReceive()` (single-byte)
- `SPI2_Start()`/`SPI2_Stop()` already updated in Phase 2
- Logic unchanged; only SPI HAL calls change

### 4.2 `CyberryPotter.h` / `CyberryPotter.c`
- Replace `#include "stm32f10x.h"` → `#include "stm32f1xx_hal.h"`
- `System_Init()`: already delegates to individual `_Init()` functions; no change
- `EXTI_Stop()` / `EXTI_Restore()`: Replace `EXTI->IMR` with `__HAL_GPIO_EXTI_DISABLE_IT(EXTI_Line0)` / `__HAL_GPIO_EXTI_ENABLE_IT(EXTI_Line0)`
- `ADC_GetValue()`: Replace with HAL calls
- `EXTI9_5_IRQHandler`: Replace SPL calls with HAL macros
- Consolidate `NVIC_PriorityGroupConfig(NVIC_PriorityGroup_2)` — call only once in `main()` before `HAL_Init()`
- Remove all garbled comments

### 4.3 `main.c`
- Add `HAL_Init()` and `SystemClock_Config()` at entry
- Add `MX_GPIO_Init()` generated-style function (or inline in `System_Init`)
- Rest of main logic unchanged (model inference, button polling)

## Phase 5: Modules (IR, RF, BLE)

### 5.1 `module_IR_RF.h` / `module_IR_RF.c`
- Replace `EXTI->IMR` register access with `HAL_NVIC_DisableIRQ`/`HAL_NVIC_EnableIRQ` for EXTI7
- Replace `TIM_Cmd(TIM2, ENABLE/DISABLE)` → `HAL_TIM_Base_Start`/`HAL_TIM_Base_Stop`
- Replace `TIM_GetCounter` → `__HAL_TIM_GET_COUNTER`
- Replace `TIM_SetCounter` → `__HAL_TIM_SET_COUNTER`
- `TIM2_IRQHandler`: Replace `TIM_GetITStatus` → `__HAL_TIM_GET_FLAG`, `TIM_ClearITPendingBit` → `__HAL_TIM_CLEAR_FLAG`

### 5.2 `module0_IR.h` / `module0_IR.c`
- Replace `RCC_APB2PeriphClockCmd` → `__HAL_RCC_xxx_CLK_ENABLE()`
- Replace `RCC_APB1PeriphClockCmd` → `__HAL_RCC_xxx_CLK_ENABLE()`
- Replace `GPIO_Init` → `HAL_GPIO_Init`
- Replace `TIM_TimeBaseInit` for TIM3 → `HAL_TIM_PWM_Init(&htim3)`
- Replace `TIM_OCStructInit`/`TIM_OC1Init` → `HAL_TIM_PWM_ConfigChannel(&htim3, &sConfigOC, TIM_CHANNEL_1)`
- Replace `TIM_SetCompare1` → `__HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, value)`
- Replace `IR_PWM_ENABLE`/`IR_PWM_DISABLE` → `HAL_TIM_PWM_Start`/`HAL_TIM_PWM_Stop`
- Replace `GPIO_WriteBit` → `HAL_GPIO_WritePin`

### 5.3 `module1_RF433.h` / `module1_RF433.c` & `module2_RF315.h` / `module2_RF315.c`
- Same pattern: GPIO_Init → HAL, TIM → HAL, EXTI → HAL

### 5.4 `module3-10` files
- module3: uses USART3_WriteByte → already migrated in Phase 2
- Other modules: typically GPIO toggles and USART → same HAL patterns

## Phase 6: CMSIS, Startup, HAL Config

### 6.1 Replace startup and system files
- Remove `RTE/Device/STM32F103C8/startup_stm32f10x_md.s`
- Remove `RTE/Device/STM32F103C8/system_stm32f10x.c`
- Add standard CubeMX `startup_stm32f103xb.s` and `system_stm32f1xx.c`
- Add `stm32f1xx_hal_conf.h` with enabled module defines

### 6.2 Create `stm32f1xx_hal_msp.c`
- Centralize all `HAL_*_MspInit()` functions for each peripheral
- Each MspInit configures: GPIOs, NVIC, DMA (if used), clocks

### 6.3 Create `stm32f1xx_it.c`
- Centralize all interrupt handlers (SysTick, EXTI, TIM, USART, etc.)
- Move handlers from individual .c files to here
- Use HAL handler dispatch (`HAL_GPIO_EXTI_IRQHandler`, `HAL_TIM_IRQHandler`, etc.)

### 6.4 Remove MDK-ARM RTE files
- `RTE/Device/STM32F103C8/*.base@*` files (backup files)
- `RTE/Device/STM32F103CB/*` (duplicate target)
- `RTE/_Target_1/RTE_Components.h` (MDK specific)

## Phase 7: Build System & Cleanup

### 7.1 Build configuration
- Keep existing EIDE build or transition to Makefile/CMake
- Ensure HAL library sources are included in build path
- Verify STM32F1xx_HAL_Driver path

### 7.2 Code style cleanup (applied throughout)
- Remove ALL comments (garbled Chinese + English)
- Standardize header guards: `#ifndef __FILE_H__` → `#ifndef __FILE_H__` (already consistent)
- Remove unnecessary `volatile` qualifiers from loop counters and locals
- Remove commented-out dead code blocks
- Simplify repeated patterns (e.g., module init switch cases)
- Use `static` for internal functions where possible
- `int` → `int32_t` for portability where meaningful

## Verification
1. Build with `arm-none-eabi-gcc -Wall -Wextra` (or ARM Compiler 6)
2. Verify no SPL symbols remain: `grep -r "RCC_APB\|GPIO_InitTypeDef\|USART_InitTypeDef\|SPI_InitTypeDef\|TIM_TimeBaseInitTypeDef\|ADC_InitTypeDef\|EXTI_InitTypeDef\|NVIC_InitTypeDef" --include="*.c" --include="*.h"`
3. Verify HAL include is present in all files that need it
4. Flash to physical STM32F103 board and verify:
   - LED blinks on startup
   - Button press triggers IMU sampling
   - Serial output on USART1
   - Module detection via ADC
   - IR/RF transmit/receive
   - W25Q64 flash read/write
   - CNN model inference
