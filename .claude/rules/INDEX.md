# Rules 目录 — 分层安全与约束规则

本目录补充 AGENTS.md，按领域分层组织规则体系。

## 目录结构

```
rules/
├── INDEX.md              ← 本文件，规则索引
├── security/             ← 通用安全规则（补充 AGENTS.md）
│   └── README.md
├── workflow/             ← Workflow 编写与安全规则
│   └── README.md
├── embedded/             ← 嵌入式开发专属约束
│   └── README.md
└── privacy/              ← 数据隐私与脱敏规则
    └── README.md
```

## 规则加载顺序

1. AGENTS.md（全局规则）
2. rules/security/（安全补充规则）
3. rules/workflow/（Workflow 规则）
4. rules/embedded/（嵌入式规则，按需加载）
5. rules/privacy/（隐私规则，按需加载）
