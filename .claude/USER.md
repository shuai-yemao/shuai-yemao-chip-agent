# User Profile

> This file describes the user you serve. Update it as you learn more.

## Name

TNSH

## Preferences

- **语言**：中文（Simplified Chinese），代码/寄存器/路径/命令保持英文
- **风格**：简洁务实，用数据支撑结论。省略无关背景，直接可执行方案
- **嵌入式领域**：STM32 Cortex-M3/M4/M7、ESP32-S3、FreeRTOS、外设驱动、通信协议
- **知识管理**：使用 Obsidian 管理嵌入式知识，按 `领域/嵌入式/` 层级组织
- **问题记录**：使用「嵌入式系统诊断流程模板」的四段式结构记录开发问题
- **代码规范**：立芯嵌入式 C 编码规范
- **MISRA**：车规/MISRA C:2012 合规性关注

## Timezone

UTC+8 (Asia/Shanghai)

## Context

### 工作环境
- **操作系统**：Windows
- **Python**：`C:\Users\zhang\AppData\Local\Programs\Python\Python312\python`
- **Obsidian Vault**：`C:\Users\zhang\Documents\Obsidian Vault`
  - 自动发现。嵌入式知识在 `领域\嵌入式\` 目录下
  - 问题记录模板：`领域\嵌入式\嵌入式项目文档\嵌入式系统诊断流程模板.md`
  - 问题记录输出：`领域\嵌入式\嵌入式项目文档\问题记录\{项目名}/`
- **CherryStudio 数据**：`C:\Users\zhang\AppData\Roaming\CherryStudio\Data\`
  - 知识库路径：`KnowledgeBase\`
  - Skills 路径：`Skills\knowledge-base-search\scripts\`

### 自建工具链路
| 工具 | 功能 | 路径 |
|------|------|------|
| `kb_search.py` | 跨 KB 检索 (BM25+RRF+MMR) | Skills/knowledge-base-search/scripts/ |
| `verify_claims.py` | 搜索结果真伪验证 | Skills/knowledge-base-search/scripts/ |
| `record_issue.py` | 问题记录→Obsidian 归档 | Skills/knowledge-base-search/scripts/ |
| `fetch_datasheet.py` | 芯片/传感器数据手册获取 | Skills/knowledge-base-search/scripts/ |
| `import_to_kb.py` | 外部内容导入本地 KB | Skills/knowledge-base-search/scripts/ |

### 知识库现状
- `nwK36RVGrUfLNv57o0D4y` — CherryStudio 主 KB，18,863 chunks，198.7 MB（含 RM0090/RM0008 等官方手册）
- `obsidian:Obsidian Vault` — Obsidian vault，363 chunks，98 个 .md 文件（ARM/STM32、ESP32、FreeRTOS、通信协议、传感器等）
- `imported_docs` — 外部导入知识库，验证通过的内容闭环写入
