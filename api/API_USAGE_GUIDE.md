# 引易转 API 调用指南

## API 端点概览

| 端点 | 方法 | 功能 | 参数 |
|------|------|------|------|
| `/api/convert` | POST | 单个引用转换 | `{ text, format }` |
| `/api/batch-convert` | POST | 批量引用转换 | `{ items: [{ text, format }] }` |
| `/api/parse` | POST | 智能解析（不格式化） | `{ text }` |
| `/api/formats` | GET | 获取支持格式 | 无 |
| `/api/health` | GET | 健康检查 | 无 |

---

## 1. 单个引用转换

### 请求示例

```bash
curl -X POST https://yinyizhuan.vercel.app/api/convert \
  -H "Content-Type: application/json" \
  -d '{
    "text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
    "format": "gbt7714"
  }'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "original": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
    "format": "gbt7714",
    "result": "王戎笙. 清代前期移民史[J]. 历史研究, 1998(3).",
    "citation": {
      "id": "abc123",
      "type": "journal",
      "language": "zh",
      "title": "清代前期移民史",
      "authors": [{ "name": "王戎笙" }],
      "journalName": "历史研究",
      "publishYear": "1998",
      "issue": "3"
    },
    "metadata": {
      "language": "zh",
      "type": "journal",
      "authorCount": 1
    }
  },
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

---

## 2. 批量引用转换

### 请求示例

```bash
curl -X POST https://yinyizhuan.vercel.app/api/batch-convert \
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
  }'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "index": 0,
        "success": true,
        "original": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
        "result": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
        "citation": { ... }
      },
      {
        "index": 1,
        "success": true,
        "original": "张三：《测试著作》，北京：人民出版社，2020年。",
        "result": "张三：《测试著作》，北京：人民出版社，2020年。",
        "citation": { ... }
      }
    ]
  },
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

---

## 3. 智能解析（不格式化）

### 请求示例

```bash
curl -X POST https://yinyizhuan.vercel.app/api/parse \
  -H "Content-Type: application/json" \
  -d '{
    "text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。"
  }'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "original": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
    "citation": {
      "id": "abc123",
      "type": "journal",
      "language": "zh",
      "title": "清代前期移民史",
      "authors": [{ "name": "王戎笙" }],
      "journalName": "历史研究",
      "publishYear": "1998",
      "issue": "3",
      "pages": null,
      "publisher": null
    },
    "metadata": {
      "language": "zh",
      "type": "journal",
      "authorCount": 1,
      "hasPublisher": false,
      "hasJournal": true,
      "hasYear": true
    }
  },
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

---

## 4. 获取支持格式

### 请求示例

```bash
curl https://yinyizhuan.vercel.app/api/formats
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "formats": [
      { "id": "lsyj", "name": "《历史研究》格式", "description": "历史研究杂志社引文注释规范" },
      { "id": "gbt7714", "name": "GB/T 7714-2015", "description": "信息与文献 参考文献著录规则" },
      { "id": "apa", "name": "APA 第7版", "description": "美国心理学会引用格式" }
    ],
    "supportedTypes": [
      "book", "chapter", "journal", "newspaper", "thesis",
      "archive", "ancient", "electronic", "conference",
      "diary", "transferred", "classic"
    ],
    "supportedLanguages": ["zh", "en", "ja"]
  },
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

---

## 5. 健康检查

### 请求示例

```bash
curl https://yinyizhuan.vercel.app/api/health
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-06-27T12:00:00.000Z",
    "uptime": 12345.67,
    "environment": "production"
  }
}
```

---

## 编程语言调用示例

### Python

```python
import requests

class YinyizhuanAPI:
    def __init__(self, base_url="https://yinyizhuan.vercel.app"):
        self.base_url = base_url
    
    def convert(self, text, format="lsyj"):
        """转换单个引用"""
        response = requests.post(
            f"{self.base_url}/api/convert",
            json={"text": text, "format": format},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    
    def batch_convert(self, items):
        """批量转换"""
        response = requests.post(
            f"{self.base_url}/api/batch-convert",
            json={"items": items},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    
    def parse(self, text):
        """智能解析"""
        response = requests.post(
            f"{self.base_url}/api/parse",
            json={"text": text},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    
    def get_formats(self):
        """获取支持格式"""
        response = requests.get(f"{self.base_url}/api/formats")
        response.raise_for_status()
        return response.json()
    
    def health_check(self):
        """健康检查"""
        response = requests.get(f"{self.base_url}/api/health")
        response.raise_for_status()
        return response.json()


# 使用示例
api = YinyizhuanAPI()

# 单个转换
result = api.convert(
    "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
    format="gbt7714"
)
print(result["data"]["result"])

# 批量转换
batch_result = api.batch_convert([
    {"text": "引用1...", "format": "lsyj"},
    {"text": "引用2...", "format": "apa"}
])
for item in batch_result["data"]["results"]:
    print(f"[{item['index']}] {item['result']}")
```

### JavaScript/TypeScript

```typescript
class YinyizhuanAPI {
  private baseUrl: string;

  constructor(baseUrl = 'https://yinyizhuan.vercel.app') {
    this.baseUrl = baseUrl;
  }

  async convert(text: string, format: string = 'lsyj') {
    const response = await fetch(`${this.baseUrl}/api/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, format })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async batchConvert(items: Array<{text: string, format?: string}>) {
    const response = await fetch(`${this.baseUrl}/api/batch-convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async parse(text: string) {
    const response = await fetch(`${this.baseUrl}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async getFormats() {
    const response = await fetch(`${this.baseUrl}/api/formats`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async healthCheck() {
    const response = await fetch(`${this.baseUrl}/api/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
}

// 使用示例
const api = new YinyizhuanAPI();

// 单个转换
const result = await api.convert(
  '王戎笙：《清代前期移民史》，《历史研究》1998年第3期。',
  'gbt7714'
);
console.log(result.data.result);

// 批量转换
const batchResult = await api.batchConvert([
  { text: '引用1...', format: 'lsyj' },
  { text: '引用2...', format: 'apa' }
]);
batchResult.data.results.forEach(item => {
  console.log(`[${item.index}] ${item.result}`);
});
```

### Go

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type ConvertRequest struct {
	Text   string `json:"text"`
	Format string `json:"format"`
}

type BatchRequest struct {
	Items []ConvertRequest `json:"items"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

func convert(text, format string) (*APIResponse, error) {
	reqBody := ConvertRequest{
		Text:   text,
		Format: format,
	}
	
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}
	
	resp, err := http.Post(
		"https://yinyizhuan.vercel.app/api/convert",
		"application/json",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	
	var result APIResponse
	err = json.Unmarshal(body, &result)
	if err != nil {
		return nil, err
	}
	
	return &result, nil
}

func main() {
	result, err := convert(
		"王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
		"gbt7714",
	)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	
	fmt.Printf("Result: %+v\n", result)
}
```

### Java

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

public class YinyizhuanAPI {
    private static final String BASE_URL = "https://yinyizhuan.vercel.app";
    private final HttpClient client;
    
    public YinyizhuanAPI() {
        this.client = HttpClient.newHttpClient();
    }
    
    public String convert(String text, String format) throws Exception {
        String json = String.format(
            "{\"text\": \"%s\", \"format\": \"%s\"}",
            text.replace("\"", "\\\""),
            format
        );
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/convert"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        
        HttpResponse<String> response = client.send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );
        
        return response.body();
    }
    
    public static void main(String[] args) throws Exception {
        YinyizhuanAPI api = new YinyizhuanAPI();
        String result = api.convert(
            "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
            "gbt7714"
        );
        System.out.println(result);
    }
}
```

---

## 错误处理

### 常见错误码

| 状态码 | 含义 | 原因 |
|--------|------|------|
| 400 | Bad Request | 请求参数错误 |
| 405 | Method Not Allowed | 使用了不支持的HTTP方法 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |

### 错误响应示例

```json
{
  "success": false,
  "error": "Invalid input",
  "message": "Text field is required and must be a string"
}
```

### 错误处理代码示例

```python
import requests
from requests.exceptions import HTTPError

def convert_with_error_handling(text, format="lsyj"):
    try:
        response = requests.post(
            "https://yinyizhuan.vercel.app/api/convert",
            json={"text": text, "format": format},
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    except HTTPError as e:
        if e.response.status_code == 400:
            print(f"请求参数错误: {e.response.json()['message']}")
        elif e.response.status_code == 429:
            print("请求频率超限，请稍后再试")
        elif e.response.status_code == 500:
            print("服务器内部错误")
        else:
            print(f"HTTP错误: {e}")
        return None
    except Exception as e:
        print(f"请求失败: {e}")
        return None
```

---

## 最佳实践

### 1. 批量转换优先
```python
# ❌ 不推荐：多次单个转换
for text in texts:
    result = api.convert(text)

# ✅ 推荐：批量转换
items = [{"text": text, "format": "lsyj"} for text in texts]
result = api.batch_convert(items)
```

### 2. 缓存结果
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_convert(text, format):
    return api.convert(text, format)
```

### 3. 重试机制
```python
import time
from functools import wraps

def retry(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise e
                    time.sleep(delay * (2 ** attempt))
            return None
        return wrapper
    return decorator

@retry(max_retries=3, delay=1)
def convert_with_retry(text, format):
    return api.convert(text, format)
```

### 4. 速率限制
```python
import time

class RateLimiter:
    def __init__(self, max_requests, time_window):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
    
    def wait_if_needed(self):
        now = time.time()
        self.requests = [r for r in self.requests if now - r < self.time_window]
        
        if len(self.requests) >= self.max_requests:
            sleep_time = self.time_window - (now - self.requests[0])
            time.sleep(sleep_time)
        
        self.requests.append(time.time())

# 使用
limiter = RateLimiter(max_requests=10, time_window=60)
limiter.wait_if_needed()
result = api.convert(text, format)
```

---

## 测试脚本

```bash
#!/bin/bash

BASE_URL="https://yinyizhuan.vercel.app"

echo "🧪 测试引易转 API"
echo "=================="

# 测试健康检查
echo ""
echo "1. 测试健康检查..."
curl -s "$BASE_URL/api/health" | jq .

# 测试单个转换
echo ""
echo "2. 测试单个转换..."
curl -s -X POST "$BASE_URL/api/convert" \
  -H "Content-Type: application/json" \
  -d '{"text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。", "format": "gbt7714"}' | jq .

# 测试批量转换
echo ""
echo "3. 测试批量转换..."
curl -s -X POST "$BASE_URL/api/batch-convert" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。", "format": "lsyj"},
      {"text": "张三：《测试著作》，北京：人民出版社，2020年。", "format": "gbt7714"}
    ]
  }' | jq .

echo ""
echo "✅ 测试完成"
```

---

## 联系与支持

如有问题，请通过以下方式联系：
- GitHub Issues: [项目地址]
- 邮箱: [联系邮箱]

## 许可证

MIT License
