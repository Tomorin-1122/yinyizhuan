#!/bin/bash

# 引易转 API 测试脚本

BASE_URL="http://localhost:3000"

echo "🧪 测试引易转 API"
echo "=================="

# 测试健康检查
echo ""
echo "1. 测试健康检查..."
curl -s "$BASE_URL/api/health" | jq .
echo ""

# 测试获取格式
echo "2. 测试获取格式..."
curl -s "$BASE_URL/api/formats" | jq .
echo ""

# 测试单个转换
echo "3. 测试单个转换..."
curl -s -X POST "$BASE_URL/api/convert" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
    "format": "gbt7714"
  }' | jq .
echo ""

# 测试智能解析
echo "4. 测试智能解析..."
curl -s -X POST "$BASE_URL/api/parse" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。"
  }' | jq .
echo ""

# 测试批量转换
echo "5. 测试批量转换..."
curl -s -X POST "$BASE_URL/api/batch-convert" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
        "format": "lsyj"
      },
      {
        "text": "张三：《测试著作》，北京：人民出版社，2020年。",
        "format": "gbt7714"
      }
    ]
  }' | jq .
echo ""

echo "✅ 测试完成"
