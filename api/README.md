# 引易转 API 接口

这是引易转网站的AGENT接口，基于Vercel Functions实现。

## 目录结构

```
api/
├── _lib/                    # 核心库（从src/lib复制）
│   ├── formatters/         # 格式化器
│   │   ├── apa.ts
│   │   ├── author-utils.ts
│   │   ├── gbt7714.ts
│   │   ├── index.ts
│   │   └── lsyj.ts
│   ├── parser.ts           # 解析器
│   ├── publisher-places.ts # 出版社地址
│   ├── types.ts            # 类型定义
│   └── utils.ts            # 工具函数
├── convert.ts              # 单个转换端点
├── batch-convert.ts        # 批量转换端点
├── parse.ts                # 智能解析端点
├── formats.ts              # 获取支持格式
└── health.ts               # 健康检查
```

## API 端点

### 1. 单个转换
```http
POST /api/convert
Content-Type: application/json

{
  "text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
  "format": "gbt7714"
}
```

### 2. 批量转换
```http
POST /api/batch-convert
Content-Type: application/json

{
  "items": [
    { "text": "...", "format": "lsyj" },
    { "text": "...", "format": "apa" }
  ]
}
```

### 3. 智能解析
```http
POST /api/parse
Content-Type: application/json

{
  "text": "原始文本"
}
```

### 4. 获取支持格式
```http
GET /api/formats
```

### 5. 健康检查
```http
GET /api/health
```

## 回溯方法

如果需要完全移除API架构，只需删除以下内容：

```bash
# 删除API目录
rm -rf api/

# 恢复原始vercel.json
git checkout vercel.json
```

或者使用git回溯：
```bash
# 查看更改
git status

# 回溯所有更改
git checkout .

# 或者只回溯特定文件
git checkout vercel.json
git rm -r api/
```

## 部署

1. 确保已安装Vercel CLI：
```bash
npm i -g vercel
```

2. 部署到Vercel：
```bash
vercel deploy
```

3. 或者推送到GitHub，Vercel会自动部署。

## 注意事项

1. **不修改原有文件**：所有API代码都在`api/`目录中，不影响原有前端代码
2. **独立库文件**：`api/_lib/`是从`src/lib/`复制的，修改不会影响原有代码
3. **易于回溯**：删除`api/`目录即可完全移除API功能
4. **CORS支持**：所有端点都支持跨域请求
5. **错误处理**：所有端点都有完善的错误处理

## 测试

使用curl测试API：

```bash
# 测试单个转换
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '{"text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。", "format": "gbt7714"}'

# 测试健康检查
curl http://localhost:3000/api/health
```

## 许可证

与引易转主项目相同。
