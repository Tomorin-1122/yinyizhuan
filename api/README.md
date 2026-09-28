# 引易转 API 文档

> **版本** v1 · **更新日期** 2026-09-28
> 本文档与 `api/*.js` 同仓库维护，接口变更时请同步更新（改接口必改文档）。

## 概览

| 端点 | 方法 | 功能 | 限流 |
|------|------|------|------|
| `/api/health` | GET | 健康检查 | 无 |
| `/api/formats` | GET | 获取支持的格式/文献类型清单 | 无 |
| `/api/convert` | POST | 单条引用解析 + 转换 | 60 次/分钟 |
| `/api/parse` | POST | 智能解析（只解析，不转换） | 60 次/分钟 |
| `/api/batch-convert` | POST | 批量转换（≤50 条） | 10 次/分钟 |
| `/api/ancient-db` | GET | 古籍数据库搜索 / 详情 / 统计 | 无 |
| `/api/history-analyze` | POST | 历史记录聚合统计 | 30 次/分钟 |

## 通用约定

**Base URL**：`https://yinyizhuan.cn/api`（同 `https://yinyizhuan.vercel.app/api`）

**响应包络**：所有接口统一返回 `{ success, data?, error?, message?, timestamp }`——成功时 `success: true` 且带 `data`；失败时 `success: false` 且带 `error`（短码）与 `message`（人类可读说明）。

**认证**：无鉴权头，接口公开。防护手段为 CORS 白名单（仅 `yinyizhuan.cn` / `yinyizhuan.vercel.app` / `localhost:5173` / `localhost:4173`，白名单外浏览器侧跨域被禁）+ IP 限流。历史遗留说明：Vercel 环境变量中配置过 API Key，**当前代码未启用校验**。

**限流机制**：内存计数（`Map`），按客户端 IP 识别（Vercel 上取平台注入的 `x-vercel-forwarded-for`，客户端不可伪造）。

- 超限返回 `429`，并携带 `X-RateLimit-Limit` / `X-RateLimit-Remaining` / `X-RateLimit-Reset` 响应头
- ⚠️ Serverless 实例无状态，冷启动后计数重置，实际可用次数可能略高于标称值；如需精确限流需引入 Vercel KV / Redis

**错误码**：

| 状态码 | 场景 |
|--------|------|
| 200 | 成功（batch-convert 中个别条目失败也算整体成功，见端点详情） |
| 400 | 参数缺失 / 非法（字段类型、超长、格式不支持） |
| 405 | HTTP 方法不符 |
| 429 | 触发限流 |
| 500 | 服务器内部错误 |

## 端点详情

### GET /api/health

健康检查，无参数。

```json
{ "success": true, "data": { "status": "healthy", "timestamp": "..." } }
```

### GET /api/formats

返回支持的全部格式与类型，供前端渲染下拉项。

- `formats`：`[{ id: 'lsyj' | 'gbt7714' | 'apa', name, description }]`
- `supportedTypes`：12 种文献类型（book / chapter / journal / newspaper / thesis / archive / ancient / electronic / conference / diary / transferred / classic）
- `supportedLanguages`：`zh` / `en` / `ja`

### POST /api/convert

解析一条引用文本并转换为目标格式。

```json
{ "text": "引用原文", "format": "lsyj" }
```

- `text`：必填，字符串，≤ 5000 字符
- `format`：可选，`lsyj`（默认）/ `gbt7714` / `apa`

响应 `data`：`original`（原文）、`format`、`result`（转换结果字符串）、`citation`（解析出的字段摘要：id / type / language / title / authors / publisher / publishYear / journalName / pages）、`metadata`（language / type / authorCount）。

### POST /api/parse

只解析不转换，返回的字段比 convert 更全（含 `publishPlace`、`rawText`），并带字段存在性标记（`hasPublisher` / `hasJournal` / `hasYear`），适合"先解析预览、再填表单"的场景。

请求体 `{ "text": "引用原文" }`，≤ 5000 字符。

### POST /api/batch-convert

批量转换。

```json
{ "items": [ { "text": "第一条", "format": "gbt7714" } ] }
```

- `items`：必填数组，最多 50 条；每条 `text` ≤ 5000 字符；`format` 同 convert，缺省 `lsyj`
- **单条失败不中断整批**：失败条目在 `results` 中返回 `success: false` 与 `error: "转换失败，请检查输入格式"`

响应 `data`：`total` / `successful` / `failed` / `results[]`（results 项含 `index`、`success`、`original`、`result`、`citation` 摘要）。

### GET /api/ancient-db

古籍数据库查询（6 丛书，17556 条记录，JSON 懒加载）。三种用法：

| 用法 | 参数 | 说明 |
|------|------|------|
| 搜索 | `?q=关键词&limit=20` | `q` 必填；`limit` 默认 10，**上限 50**（超限截断，防全库扫描） |
| 详情 | `?action=get&id=<记录ID>` | 按 ID 取单条 |
| 统计 | 无参数 | 返回总数、按丛书/出版社/出版年份区间/四部分类（经史子集）的聚合 |

记录字段含 `series` / `publisher` / `publishYear` / `category` 等。

### POST /api/history-analyze

对前端上传的转换历史做聚合统计，**纯计算不存储**。

```json
{ "records": [ { "targetFormat": "lsyj", "citationType": "ancient", "language": "zh", "authors": ["张三"], "timestamp": "2026-09-28T..." } ] }
```

- `records`：必填数组，最多 5000 条；非对象记录直接跳过
- 字段容错：未知的 format/type/language 归入"其他"

响应 `data`：`total` / `uniqueAuthors` / `topAuthors`（≤10）/ `byFormat` / `byType` / `byLanguage` / `byMonth` / `topDays` / `topFormats` / `topTypes`。

## 变更记录

- **v1**（2026-09-28）：首版，覆盖全部 7 个端点；限流数值与行为均从代码核实。
