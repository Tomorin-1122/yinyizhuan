# 引易转 API 架构搭建总结

## 搭建时间
2026-06-27

## 搭建目标
在项目文件夹搭建初步AGENT接口架构，不修改原有文件，全程可回溯。

## 完成的工作

### 1. 创建API目录结构
```
api/
├── _lib/                    # 核心库
│   ├── formatters/         # 格式化器
│   ├── parser.ts           # 解析器
│   ├── types.ts            # 类型定义
│   └── utils.ts            # 工具函数
├── convert.ts              # 单个转换端点
├── batch-convert.ts        # 批量转换端点
├── parse.ts                # 智能解析端点
├── formats.ts              # 获取支持格式
├── health.ts               # 健康检查
├── test.sh                 # 测试脚本
├── rollback.sh             # 回溯脚本
├── README.md               # API文档
└── ARCHITECTURE.md         # 架构图
```

### 2. 复制核心库文件
从`src/lib/`复制以下文件到`api/_lib/`：
- types.ts - 类型定义
- parser.ts - 解析器
- utils.ts - 工具函数
- publisher-places.ts - 出版社地址
- formatters/ - 格式化器目录
- opencc/ - 简繁转换库

### 3. 创建API端点
实现以下5个API端点：
1. **POST /api/convert** - 单个引用转换
2. **POST /api/batch-convert** - 批量引用转换
3. **POST /api/parse** - 智能解析（不格式化）
4. **GET /api/formats** - 获取支持格式
5. **GET /api/health** - 健康检查

### 4. 更新vercel.json配置
添加以下配置：
- Functions运行时配置
- API路由重写
- CORS头设置

### 5. 创建回溯机制
提供三种回溯方式：
1. 删除api/目录
2. 使用rollback.sh脚本
3. 使用git stash

## 技术特点

### ✅ 优势
1. **不修改原有代码**：所有新增代码都在api/目录
2. **完全可回溯**：删除api/目录即可恢复
3. **独立库文件**：api/_lib/是src/lib/的副本，互不影响
4. **易于测试**：提供测试脚本
5. **文档完整**：包含README和架构图

### 📊 代码统计
- 新增文件：21个
- 新增代码行数：约500行
- API端点：5个
- 核心库文件：10个

## 使用方法

### 本地测试
```bash
# 启动开发服务器
npm run dev

# 测试API
./api/test.sh
```

### 部署到Vercel
```bash
# 推送到GitHub
git add api/ vercel.json
git commit -m "feat: 添加AGENT API接口"
git push

# Vercel会自动部署
```

### 回溯操作
```bash
# 方式1：使用回溯脚本
./api/rollback.sh

# 方式2：手动删除
rm -rf api/
git checkout vercel.json

# 方式3：使用git stash
git stash push -m "备份API架构"
git checkout .
git clean -fd
```

## 下一步计划

### 短期（1-2周）
1. 测试所有API端点
2. 优化错误处理
3. 添加速率限制

### 中期（1个月）
1. 添加API密钥认证
2. 实现使用量追踪
3. 添加更多格式支持

### 长期（3个月+）
1. 开发AGENT SDK
2. 集成到Zotero插件
3. 开发商业化功能

## 注意事项

1. **Vercel Hobby计划限制**：
   - 1,000,000次/月函数调用
   - 仅限个人非商业用途
   - 超出限制需等待30天

2. **成本控制**：
   - 监控使用量
   - 设置合理的速率限制
   - 缓存热门查询

3. **安全性**：
   - 验证所有输入
   - 防止恶意请求
   - 保护API密钥

## 相关文档

- [API使用文档](./README.md)
- [架构设计图](./ARCHITECTURE.md)
- [Vercel Functions文档](https://vercel.com/docs/functions)

## 联系方式

如有问题，请联系项目维护者。
