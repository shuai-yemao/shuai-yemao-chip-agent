# Wechatsync × Obsidian 集成方案

## Context

用户需要将 Obsidian vault 中的 Markdown 笔记一键发布到 CSDN、知乎、博客园、微信公众号。核心问题是 Obsidian 的 Markdown 扩展语法（Wiki-link、嵌入图片、Mermaid、Callout、标签）与标准 Markdown 不兼容，直接粘贴到 Wechatsync 编辑器会导致格式丢失。

**用户期望的工作流**: Obsidian 中一键导出 → 浏览器自动打开 Wechatsync 编辑器 → 预览内容 → 选择平台 → 同步发布

## Wechatsync 架构分析

```
当前流程:
  浏览器页面 → Content Script 提取 HTML → Turndown 转 Markdown → 编辑器预览 → 适配器同步

关键文件:
  packages/core/src/lib/turndown.ts          — HTML → Markdown 转换
  packages/core/src/lib/markdown-images.ts   — 图片解析
  packages/core/src/adapters/code-adapter.ts — 平台适配器基类
  packages/extension/src/editor/EditorApp.tsx — 编辑器 UI
  packages/extension/src/content/extractor.ts — 内容提取器
  packages/extension/src/background/sync-service.ts — 同步服务

数据流:
  Article { title, markdown, html, cover, tags }
    → editor 展示 HTML
    → user 编辑/选择平台
    → preprocessForPlatform() 按平台预处理
    → adapter.publish() 发送到平台 API
```

## 改造方案

### 整体架构

```
Obsidian 笔记 (.md)
    ↓ Obsidian Plugin（convert-obsidian.ts）
    ↓ 转换: Wiki-link → 链接, 图片 → 标准 img, Mermaid → PNG, Callout → blockquote
    ↓ 输出: 标准 HTML
    ↓
    ↓ Plugin 打开 Wechatsync 编辑器 URL + 传递数据
    ↓
Wechatsync 编辑器（修改 EditorApp.tsx）
    ↓ 接收 HTML 内容
    ↓ 预览 + 用户编辑
    ↓ 选择平台 → 同步
```

### 修改文件清单

#### 1. 新增: `packages/core/src/lib/obsidian-converter.ts`

Obsidian Markdown → 标准 HTML 转换器（纯函数，零 DOM 依赖）

```typescript
// 核心转换流水线
export function convertObsidianToHtml(markdown: string, options?: ObsidianConvertOptions): string {
  // 1. 删除 frontmatter
  // 2. 转换 Wiki-link: [[note|alias]] → <a> 或纯文本
  // 3. 转换嵌入图片: ![[file.png]] → <img src="...">
  // 4. 转换嵌入笔记: ![[note]] → <a> 链接
  // 5. 转换 Callout: > [!note] → <blockquote><strong>
  // 6. 清理行内标签: #tag → 删除
  // 7. Mermaid 代码块标记（保留，由渲染器处理）
  // 8. 标准 Markdown → HTML（用 marked/turndown 反向）
}
```

依赖: `marked`（Markdown → HTML）或复用现有 turndown 的反向能力

#### 2. 新增: `packages/core/src/lib/mermaid-renderer.ts`

Mermaid 代码块 → PNG 渲染器

```typescript
export async function renderMermaidToPng(code: string): Promise<string> {
  // 1. 尝试 mermaid.ink API (base64 GET)
  // 2. Fallback: 保留代码块
}
```

#### 3. 修改: `packages/extension/src/editor/EditorApp.tsx`

在编辑器中添加 "导入 Markdown" 按钮:

```diff
+ <button onClick={handleImportMarkdown}>导入 Markdown</button>

+ // 文件选择 → 读取 .md → convertObsidianToHtml() → 设置到 contentRef
+ // 或: 从 URL 参数/clipboard 接收预转换的 HTML
```

#### 4. 修改: `packages/extension/src/content/extractor.ts`

添加消息监听，接收来自 Obsidian 插件的内容:

```diff
+ // 监听 'IMPORT_OBSIDIAN_CONTENT' 消息
+ // 打开编辑器并注入转换后的内容
```

#### 5. 新增: Obsidian Plugin（独立仓库或 vault 内插件）

```
obsidian-wechatsync/
├── main.ts              — 插件入口
├── converter.ts         — 调用 core 的 obsidian-converter
└── manifest.json
```

功能:
- 命令面板: "Wechatsync: 导出当前笔记"
- 读取当前笔记 Markdown
- 调用 `convertObsidianToHtml()` 转换
- 渲染 Mermaid → PNG（通过 API）
- 复制 HTML 到剪贴板
- 打开 Wechatsync 编辑器页面

### 转换流水线细节

| 步骤 | Obsidian 语法 | 转换结果 |
|------|-------------|---------|
| Frontmatter | `---\n...\n---` | 删除 |
| Wiki-link | `[[note\|alias]]` | `<a>alias</a>` |
| 嵌入图片 | `![[file.png]]` | `<img src="...">` |
| 嵌入笔记 | `![[note]]` | `<a>note</a>` |
| Mermaid | `` ```mermaid `` | `<img src="mermaid.ink/...">` |
| Callout | `> [!note] Title` | `<blockquote><strong>Title:</strong>` |
| 标签 | `#tag-name` | 删除 |
| 图片路径 | `笔记附件文件夹/xxx.png` | 复制到 assets + 标准路径 |

### 测试计划

1. 用 `实现重定位.md` 作为测试输入
2. 检查转换后的 HTML:
   - Wiki-link 是否正确转换为 `<a>` 标签
   - 嵌入图片是否正确转为 `<img>` 标签
   - Mermaid 是否渲染为 PNG `<img>`
   - Callout 是否转为 `<blockquote><strong>`
   - 标签是否已清理
   - Frontmatter 是否已删除
   - 代码块是否保留语言标记
3. 在 Wechatsync 编辑器中预览 HTML
4. 同步到 CSDN/知乎/博客园/微信公众号验证

### 关键文件

- 源文件: `领域/嵌入式/开发板/ARM架构/STM32F411CEU6/实现重定位.md`
- Wechatsync 仓库: `_workspace/Wechatsync/`
- 平台导出脚本: `~/.claude/skills/platform-export/scripts/platform_export.py`（已有的转换逻辑可复用）

## 实施步骤

### Phase 1: 核心转换模块
1. 在 `packages/core/src/lib/` 创建 `obsidian-converter.ts`
2. 实现 Obsidian Markdown → HTML 转换流水线
3. 复用 `platform_export.py` 的转换逻辑（Python → TypeScript 移植）
4. 编写单元测试

### Phase 2: Mermaid 渲染
1. 在 `packages/core/src/lib/` 创建 `mermaid-renderer.ts`
2. 实现 mermaid.ink API 调用
3. 集成到转换流水线

### Phase 3: 编辑器集成
1. 修改 `EditorApp.tsx` 添加导入按钮
2. 修改 `extractor.ts` 添加消息监听
3. 支持从剪贴板/URL 参数接收内容

### Phase 4: Obsidian 插件
1. 创建 Obsidian 插件项目
2. 实现一键导出功能
3. 集成转换和 Mermaid 渲染

## 已有依赖（无需额外安装）

- `marked` v17 — Markdown → HTML 转换
- `turndown` v7 — HTML → Markdown 转换
- `remarkable` v2 — Markdown 解析器
- `yaml` — frontmatter 解析
- `unified` / `remark-*` / `rehype-*` — AST 转换管道

## 实施步骤

### Phase 1: 核心转换模块 (packages/core/src/lib/obsidian-converter.ts)
1. 实现 `convertObsidianToHtml(markdown, options)` 函数
2. 转换流水线: frontmatter → wiki-link → 图片嵌入 → 笔记嵌入 → callout → 标签 → marked 渲染
3. 用 `实现重定位.md` 验证转换正确性
4. 编写 vitest 单元测试

### Phase 2: Mermaid 渲染 (packages/core/src/lib/mermaid-renderer.ts)
1. 实现 `renderMermaidToPng(code)` — 调用 mermaid.ink API
2. 集成到转换流水线: 检测 mermaid 代码块 → 渲染 → 替换为 `<img>`

### Phase 3: 编辑器集成 (packages/extension/src/editor/EditorApp.tsx)
1. 在工具栏添加 "导入 Markdown" 按钮
2. 支持: 文件选择 (.md) / 剪贴板粘贴 / URL 参数
3. 调用 `convertObsidianToHtml()` → 设置到 contentRef

### Phase 4: Obsidian 插件 (vault 内 obsidian-wechatsync/)
1. 命令: "Wechatsync: 导出当前笔记"
2. 读取笔记 → 转换 → 复制到剪贴板 + 打开编辑器
