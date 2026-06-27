# 引易转 API 架构图

## 整体架构

```
yinyizhuan/
├── api/                          # 🆕 新增API目录（可完全回溯）
│   ├── _lib/                    # 核心库（从src/lib复制）
│   │   ├── formatters/         # 格式化器
│   │   │   ├── apa.ts         # APA格式
│   │   │   ├── gbt7714.ts     # GB/T 7714格式
│   │   │   ├── lsyj.ts        # 《历史研究》格式
│   │   │   └── index.ts       # 统一出口
│   │   ├── parser.ts           # 文本解析器
│   │   ├── types.ts            # TypeScript类型定义
│   │   └── utils.ts            # 工具函数
│   ├── convert.ts              # 单个转换API
│   ├── batch-convert.ts        # 批量转换API
│   ├── parse.ts                # 智能解析API
│   ├── formats.ts              # 格式信息API
│   ├── health.ts               # 健康检查API
│   ├── test.sh                 # 测试脚本
│   ├── rollback.sh             # 回溯脚本
│   └── README.md               # API文档
│
├── src/                          # 原有前端代码（未修改）
│   ├── lib/                    # 原有核心库
│   │   ├── parser.ts
│   │   ├── formatters/
│   │   └── ...
│   └── ...
│
├── vercel.json                   # 🔄 更新：添加API路由配置
└── package.json
```

## 数据流

```
用户/AGENT请求
      ↓
   API端点 (convert.ts, etc.)
      ↓
   parser.ts (解析文本)
      ↓
   formatters/ (格式化)
      ↓
   JSON响应
```

## 回溯方案

### 方案1：完全移除（推荐）
```bash
# 删除API目录
rm -rf api/

# 恢复vercel.json
git checkout vercel.json
```

### 方案2：使用回溯脚本
```bash
./api/rollback.sh
```

### 方案3：使用git stash
```bash
# 备份当前状态
git stash push -m "备份API架构"

# 恢复原始状态
git checkout .
git clean -fd

# 如果需要恢复API
git stash pop
```

## 文件依赖关系

```
api/convert.ts
    ├── api/_lib/parser.ts
    ├── api/_lib/formatters/index.ts
    │   ├── api/_lib/formatters/lsyj.ts
    │   ├── api/_lib/formatters/gbt7714.ts
    │   └── api/_lib/formatters/apa.ts
    └── api/_lib/types.ts

api/_lib/parser.ts
    ├── api/_lib/utils.ts
    ├── api/_lib/publisher-places.ts
    └── api/_lib/types.ts
```

## 与原有代码的关系

```
┌─────────────────────────────────────────┐
│  原有代码 (src/)                        │
│  ├── lib/parser.ts                     │
│  ├── lib/formatters/                   │
│  └── ...                               │
└─────────────────────────────────────────┘
              ↓ 复制（不修改）
┌─────────────────────────────────────────┐
│  API库 (api/_lib/)                     │
│  ├── parser.ts                         │
│  ├── formatters/                       │
│  └── ...                               │
└─────────────────────────────────────────┘
              ↓ 使用
┌─────────────────────────────────────────┐
│  API端点 (api/*.ts)                    │
│  ├── convert.ts                        │
│  ├── batch-convert.ts                  │
│  └── ...                               │
└─────────────────────────────────────────┘
```

## 优势

1. ✅ **不修改原有代码**：所有新增代码都在api/目录
2. ✅ **完全可回溯**：删除api/目录即可恢复
3. ✅ **独立库文件**：api/_lib/是src/lib/的副本，互不影响
4. ✅ **易于测试**：提供测试脚本
5. ✅ **文档完整**：包含README和架构图
