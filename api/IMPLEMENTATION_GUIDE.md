# 引易转 API 调用实现指南

## 📋 目录

1. [快速开始](#快速开始)
2. [API端点详解](#api端点详解)
3. [编程语言实现](#编程语言实现)
4. [错误处理](#错误处理)
5. [最佳实践](#最佳实践)
6. [测试与验证](#测试与验证)

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# Python
pip install requests

# Node.js
npm install node-fetch

# Go
go get net/http
```

### 2. 基本调用

```python
import requests

# 单个转换
response = requests.post(
    "https://yinyizhuan.vercel.app/api/convert",
    json={
        "text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
        "format": "gbt7714"
    }
)

result = response.json()
print(result["data"]["result"])
```

### 3. 批量转换

```python
# 批量转换
response = requests.post(
    "https://yinyizhuan.vercel.app/api/batch-convert",
    json={
        "items": [
            {"text": "引用1...", "format": "lsyj"},
            {"text": "引用2...", "format": "apa"}
        ]
    }
)

for item in response.json()["data"]["results"]:
    print(item["result"])
```

---

## 📡 API端点详解

### 1. 单个转换 `/api/convert`

**请求：**
```http
POST /api/convert
Content-Type: application/json

{
  "text": "引用文本",
  "format": "gbt7714"  // 可选：lsyj, gbt7714, apa
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "original": "原始文本",
    "format": "gbt7714",
    "result": "转换后的文本",
    "citation": { ... },
    "metadata": { ... }
  },
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

### 2. 批量转换 `/api/batch-convert`

**请求：**
```http
POST /api/batch-convert
Content-Type: application/json

{
  "items": [
    {"text": "引用1", "format": "lsyj"},
    {"text": "引用2", "format": "apa"}
  ]
}
```

**响应：**
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
        "original": "引用1",
        "result": "转换结果1",
        "citation": { ... }
      },
      ...
    ]
  }
}
```

### 3. 智能解析 `/api/parse`

**请求：**
```http
POST /api/parse
Content-Type: application/json

{
  "text": "引用文本"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "original": "原始文本",
    "citation": {
      "id": "abc123",
      "type": "journal",
      "language": "zh",
      "title": "标题",
      "authors": [{"name": "作者"}],
      ...
    },
    "metadata": {
      "language": "zh",
      "type": "journal",
      "authorCount": 1
    }
  }
}
```

### 4. 获取格式 `/api/formats`

**请求：**
```http
GET /api/formats
```

**响应：**
```json
{
  "success": true,
  "data": {
    "formats": [
      {"id": "lsyj", "name": "《历史研究》格式"},
      {"id": "gbt7714", "name": "GB/T 7714-2015"},
      {"id": "apa", "name": "APA 第7版"}
    ],
    "supportedTypes": ["book", "journal", ...],
    "supportedLanguages": ["zh", "en", "ja"]
  }
}
```

### 5. 健康检查 `/api/health`

**请求：**
```http
GET /api/health
```

**响应：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 12345.67
  }
}
```

---

## 💻 编程语言实现

### Python 完整实现

```python
import requests
from typing import List, Dict, Optional

class YinyizhuanAPI:
    def __init__(self, base_url: str = "https://yinyizhuan.vercel.app"):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json"
        })
    
    def convert(self, text: str, format: str = "lsyj") -> Dict:
        """转换单个引用"""
        response = self.session.post(
            f"{self.base_url}/api/convert",
            json={"text": text, "format": format}
        )
        response.raise_for_status()
        return response.json()
    
    def batch_convert(self, items: List[Dict[str, str]]) -> Dict:
        """批量转换引用"""
        response = self.session.post(
            f"{self.base_url}/api/batch-convert",
            json={"items": items}
        )
        response.raise_for_status()
        return response.json()
    
    def parse(self, text: str) -> Dict:
        """智能解析引用"""
        response = self.session.post(
            f"{self.base_url}/api/parse",
            json={"text": text}
        )
        response.raise_for_status()
        return response.json()
    
    def get_formats(self) -> Dict:
        """获取支持的格式"""
        response = self.session.get(f"{self.base_url}/api/formats")
        response.raise_for_status()
        return response.json()
    
    def health_check(self) -> Dict:
        """健康检查"""
        response = self.session.get(f"{self.base_url}/api/health")
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
    print(item["result"])
```

### JavaScript/TypeScript 完整实现

```typescript
interface ConvertRequest {
  text: string;
  format?: string;
}

interface BatchRequest {
  items: ConvertRequest[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
  message?: string;
}

class YinyizhuanAPI {
  private baseUrl: string;

  constructor(baseUrl = 'https://yinyizhuan.vercel.app') {
    this.baseUrl = baseUrl;
  }

  async convert(text: string, format: string = 'lsyj'): Promise<ApiResponse<any>> {
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

  async batchConvert(items: ConvertRequest[]): Promise<ApiResponse<any>> {
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

  async parse(text: string): Promise<ApiResponse<any>> {
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

  async getFormats(): Promise<ApiResponse<any>> {
    const response = await fetch(`${this.baseUrl}/api/formats`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async healthCheck(): Promise<ApiResponse<any>> {
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
  console.log(item.result);
});
```

### Go 完整实现

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type ConvertRequest struct {
	Text   string `json:"text"`
	Format string `json:"format"`
}

type BatchRequest struct {
	Items []ConvertRequest `json:"items"`
}

type APIResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data"`
	Error     string      `json:"error,omitempty"`
	Message   string      `json:"message,omitempty"`
	Timestamp string      `json:"timestamp"`
}

type YinyizhuanAPI struct {
	BaseURL    string
	HTTPClient *http.Client
}

func NewYinyizhuanAPI(baseURL string) *YinyizhuanAPI {
	return &YinyizhuanAPI{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (api *YinyizhuanAPI) Convert(text, format string) (*APIResponse, error) {
	reqBody := ConvertRequest{
		Text:   text,
		Format: format,
	}
	
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}
	
	resp, err := api.HTTPClient.Post(
		api.BaseURL+"/api/convert",
		"application/json",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	
	var result APIResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	
	return &result, nil
}

func (api *YinyizhuanAPI) BatchConvert(items []ConvertRequest) (*APIResponse, error) {
	reqBody := BatchRequest{Items: items}
	
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}
	
	resp, err := api.HTTPClient.Post(
		api.BaseURL+"/api/batch-convert",
		"application/json",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	
	var result APIResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	
	return &result, nil
}

func (api *YinyizhuanAPI) Parse(text string) (*APIResponse, error) {
	reqBody := map[string]string{"text": text}
	
	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}
	
	resp, err := api.HTTPClient.Post(
		api.BaseURL+"/api/parse",
		"application/json",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	
	var result APIResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	
	return &result, nil
}

func (api *YinyizhuanAPI) GetFormats() (*APIResponse, error) {
	resp, err := api.HTTPClient.Get(api.BaseURL + "/api/formats")
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	
	var result APIResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	
	return &result, nil
}

func (api *YinyizhuanAPI) HealthCheck() (*APIResponse, error) {
	resp, err := api.HTTPClient.Get(api.BaseURL + "/api/health")
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	
	var result APIResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	
	return &result, nil
}

func main() {
	api := NewYinyizhuanAPI("https://yinyizhuan.vercel.app")
	
	// 单个转换
	result, err := api.Convert(
		"王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
		"gbt7714",
	)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	
	fmt.Printf("Result: %+v\n", result.Data)
}
```

### Java 完整实现

```java
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.time.Duration;

public class YinyizhuanAPI {
    private static final String BASE_URL = "https://yinyizhuan.vercel.app";
    private final HttpClient client;
    
    public YinyizhuanAPI() {
        this.client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();
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
    
    public String batchConvert(String itemsJson) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/batch-convert"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(itemsJson))
            .build();
        
        HttpResponse<String> response = client.send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );
        
        return response.body();
    }
    
    public String parse(String text) throws Exception {
        String json = String.format("{\"text\": \"%s\"}", text.replace("\"", "\\\""));
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/parse"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        
        HttpResponse<String> response = client.send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );
        
        return response.body();
    }
    
    public String getFormats() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/formats"))
            .GET()
            .build();
        
        HttpResponse<String> response = client.send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );
        
        return response.body();
    }
    
    public String healthCheck() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/api/health"))
            .GET()
            .build();
        
        HttpResponse<String> response = client.send(
            request,
            HttpResponse.BodyHandlers.ofString()
        );
        
        return response.body();
    }
    
    public static void main(String[] args) throws Exception {
        YinyizhuanAPI api = new YinyizhuanAPI();
        
        // 单个转换
        String result = api.convert(
            "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。",
            "gbt7714"
        );
        System.out.println(result);
    }
}
```

---

## ⚠️ 错误处理

### 常见错误码

| 状态码 | 含义 | 原因 | 解决方案 |
|--------|------|------|----------|
| 400 | Bad Request | 请求参数错误 | 检查text和format参数 |
| 405 | Method Not Allowed | HTTP方法错误 | 使用POST方法 |
| 429 | Too Many Requests | 请求频率超限 | 降低请求频率 |
| 500 | Internal Server Error | 服务器错误 | 稍后重试 |

### 错误响应格式

```json
{
  "success": false,
  "error": "Invalid input",
  "message": "Text field is required and must be a string"
}
```

### 错误处理示例

```python
import requests
from requests.exceptions import HTTPError

def convert_with_error_handling(text, format="lsyj"):
    try:
        response = requests.post(
            "https://yinyizhuan.vercel.app/api/convert",
            json={"text": text, "format": format}
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

## ✨ 最佳实践

### 1. 使用批量转换

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

## 🧪 测试与验证

### 1. 运行测试脚本

```bash
# Python测试
python api/test_api.py

# Shell测试
./api/test.sh
```

### 2. 使用curl测试

```bash
# 健康检查
curl https://yinyizhuan.vercel.app/api/health

# 单个转换
curl -X POST https://yinyizhuan.vercel.app/api/convert \
  -H "Content-Type: application/json" \
  -d '{"text": "王戎笙：《清代前期移民史》，《历史研究》1998年第3期。", "format": "gbt7714"}'

# 批量转换
curl -X POST https://yinyizhuan.vercel.app/api/batch-convert \
  -H "Content-Type: application/json" \
  -d '{"items": [{"text": "引用1", "format": "lsyj"}, {"text": "引用2", "format": "apa"}]}'
```

### 3. 验证响应

```python
import json

def verify_response(response):
    """验证API响应格式"""
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    assert "data" in data
    assert "timestamp" in data
    return data
```

---

## 📚 相关文档

- [API使用指南](./API_USAGE_GUIDE.md)
- [架构设计](./ARCHITECTURE.md)
- [搭建总结](./SUMMARY.md)

---

## 🤝 贡献与支持

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- 邮箱联系

## 📄 许可证

MIT License
