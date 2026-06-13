# 平台导出 Skill 设计方案

## Context

用户需要将 Obsidian vault 中的 Markdown 笔记导出到飞书、微信公众号、博客园、知乎、CSDN 等博客平台。核心问题是 Obsidian 的 Markdown 扩展语法与标准 Markdown 不兼容。

## 核心问题

| 问题 | Obsidian 写法 | 平台期望 |
|------|-------------|---------|
| Wiki-link | `[[note]]` 或 `[[path/note\|显示名]]` | `[显示名](url)` 或删除 |
| 嵌入图片 | `![[image.png]]` | `![alt](./image.png)` |
| 嵌入笔记 | `![[other-note]]` | 展开为内容或删除 |
| Mermaid 图表 | `` ```mermaid `` 代码块 | 需渲染为 PNG 图片 |
| Obsidian 代码块 | `` ``` `` (无特殊) | 大部分平台支持，但 CSDN/知乎需要标记语言 |
| 标签 | `#tag-name` (行内) | 删除或转为文字 |
| Callout | `> [!note]` | `> **Note:**` 或删除 |
| Frontmatter | `---\n...\n---` | 删除 |
| Obsidian 图片路径 | `笔记附件文件夹/xxx.png` | `./assets/xxx.png` |

## 设计方案

### 创建文件

```
~/.claude/skills/platform-export/
├── SKILL.md                    # 技能文档
└── scripts/
    └── platform_export.py      # 转换脚本（Python，零依赖）
```

### platform_export.py 核心功能

**输入**：Obsidian .md 文件路径
**输出**：按平台生成多份导出文件到 `~/Desktop/platform-export/<文件名>/`

```python
# 用法
python scripts/platform_export.py <source.md> [--platforms csdn,zhihu,cnblogs,wechat,feishu]
```

**转换流水线**：

1. **通用转换**（所有平台共享）
   - 删除 frontmatter
   - Wiki-link → 普通链接 `[显示名]`
   - Obsidian 图片 `![[file.png]]` → `![](./file.png)`
   - 嵌入笔记 `![[note]]` → 展开为链接
   - 清理 callout `> [!note]` → `> **Note:**`
   - 清理标签 `#tag` → 删除

2. **Mermaid 渲染**（关键）
   - 检测 `` ```mermaid `` 代码块
   - 提取 Mermaid 代码
   - 发送到 **mermaid.ink API** 渲染为 PNG
     ```
     GET https://mermaid.ink/img/<base64_encoded_mermaid_code>
     ```
   - 保存 PNG 到导出目录的 `assets/` 子文件夹
   - 替换代码块为 `![思维导图](./assets/mermaid_0.png)`

3. **平台适配**（每个平台不同）
   - **CSDN**: 标准 Markdown，图片用相对路径，代码块保留语言标记
   - **知乎**: Markdown，图片用相对路径
   - **博客园**: 标准 Markdown，图片用 `<img>` 标签
   - **微信公众号**: HTML 格式，图片用 `<img>` 标签，代码块用 `<pre>` 包裹
   - **飞书**: 类 Markdown，支持标准图片语法

### Mermaid 渲染策略

优先级：
1. **mermaid.ink API**（默认，HTTP GET，base64 编码 Mermaid 代码）
   ```
   https://mermaid.ink/img/<base64>
   ```
   优点：无需安装，跨平台
   缺点：需要网络，mindmap 类型支持有限

2. **本地 mmdc**（如果可用）
   ```bash
   npx @mermaid-js/mermaid-cli -i input.mmd -o output.png
   ```
   优点：离线可用，支持所有图表类型
   缺点：需要 npm/puppeteer

3. **fallback**: 保留 Mermaid 代码块 + 提示文字

### 输出目录结构

```
~/Desktop/platform-export/
└── 实现重定位/
    ├── csdn.md           # CSDN 版本
    ├── zhihu.md          # 知乎版本
    ├── cnblogs.md        # 博客园版本
    ├── wechat.html       # 微信公众号版本
    ├── feishu.md         # 飞书版本
    └── assets/
        ├── mermaid_0.png # 思维导图渲染结果
        ├── mermaid_1.png
        ├── file-xxx.png  # 复制过来的 Obsidian 图片
        └── ...
```

## 测试计划

1. 用 `实现重定位.md` 作为测试输入
2. 检查各平台输出文件是否正确：
   - Wiki-link 是否已转换
   - 图片是否已转为标准格式
   - Mermaid 图表是否成功渲染为 PNG
   - 代码块格式是否正确
   - Frontmatter 是否已删除
3. 检查 Mermaid PNG 文件是否正确生成

## 关键文件

- 源文件：`领域/嵌入式/开发板/ARM架构/STM32F411CEU6/实现重定位.md`
- 输出目录：`~/Desktop/platform-export/`

## 依赖

- Python 3.8+（标准库，零外部依赖）
- 网络连接（mermaid.ink API）
