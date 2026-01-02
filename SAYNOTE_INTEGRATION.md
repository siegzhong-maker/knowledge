# saynote App 集成文档

## 概述

saynote app 可以通过 REST API 将语音转文字后的内容同步到知识管理系统。

## API 端点

**基础URL**: `https://your-app.railway.app/api`

## 快速开始

### 1. 创建单个语音笔记

**端点**: `POST /api/items`

**请求示例**:
```javascript
const response = await fetch('https://your-app.railway.app/api/items', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'memo',
    title: '待办：明天要完成项目报告',
    raw_content: '这是语音转文字后的完整内容...',
    source: 'saynote',
    tags: ['待办', '语音']
  })
});

const result = await response.json();
```

**请求体参数**:
- `type` (必需): 固定为 `'memo'`
- `title` (必需): 笔记标题
- `raw_content` (必需): 语音转文字后的内容
- `source` (可选): 来源标识，建议设置为 `'saynote'`
- `tags` (可选): 标签数组，如 `['语音', '待办']`

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "memo",
    "title": "待办：明天要完成项目报告",
    "raw_content": "这是语音转文字后的完整内容...",
    "source": "saynote",
    "tags": ["待办", "语音"],
    "created_at": 1704067200000,
    "updated_at": 1704067200000,
    "status": "pending"
  }
}
```

### 2. 批量创建笔记（可选）

如果 saynote app 需要批量上传多条笔记，可以使用批量接口：

**端点**: `POST /api/items/batch`

**请求示例**:
```javascript
const notes = [
  {
    type: 'memo',
    title: '笔记1',
    raw_content: '内容1...',
    source: 'saynote',
    tags: ['语音']
  },
  {
    type: 'memo',
    title: '笔记2',
    raw_content: '内容2...',
    source: 'saynote',
    tags: ['语音']
  }
];

const response = await fetch('https://your-app.railway.app/api/items/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ items: notes })
});

const result = await response.json();
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    { "success": true, "data": {...} },
    { "success": true, "data": {...} }
  ],
  "total": 2,
  "successCount": 2
}
```

## 完整集成示例

### Swift (iOS)

```swift
import Foundation

struct KnowledgeAPI {
    static let baseURL = "https://your-app.railway.app/api"
    
    static func syncVoiceNote(text: String, title: String) async throws -> [String: Any] {
        let url = URL(string: "\(baseURL)/items")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "type": "memo",
            "title": title,
            "raw_content": text,
            "source": "saynote",
            "tags": ["语音"]
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }
}

// 使用
Task {
    do {
        let result = try await KnowledgeAPI.syncVoiceNote(
            text: "这是语音转文字的内容",
            title: "语音笔记"
        )
        print("同步成功:", result)
    } catch {
        print("同步失败:", error)
    }
}
```

### Kotlin (Android)

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class KnowledgeAPI {
    companion object {
        private const val BASE_URL = "https://your-app.railway.app/api"
        private val client = OkHttpClient()
        private val JSON = "application/json; charset=utf-8".toMediaType()
        
        fun syncVoiceNote(text: String, title: String, callback: (Result<JSONObject>) -> Unit) {
            val body = JSONObject().apply {
                put("type", "memo")
                put("title", title)
                put("raw_content", text)
                put("source", "saynote")
                put("tags", listOf("语音"))
            }
            
            val requestBody = body.toString().toRequestBody(JSON)
            val request = Request.Builder()
                .url("$BASE_URL/items")
                .post(requestBody)
                .build()
            
            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    callback(Result.failure(e))
                }
                
                override fun onResponse(call: Call, response: Response) {
                    val result = JSONObject(response.body?.string() ?: "")
                    callback(Result.success(result))
                }
            })
        }
    }
}

// 使用
KnowledgeAPI.syncVoiceNote("这是语音转文字的内容", "语音笔记") { result ->
    result.onSuccess { json ->
        println("同步成功: $json")
    }.onFailure { error ->
        println("同步失败: $error")
    }
}
```

### JavaScript/TypeScript (React Native)

```typescript
const API_BASE = 'https://your-app.railway.app/api';

interface VoiceNote {
  text: string;
  title: string;
  tags?: string[];
}

async function syncVoiceNote(note: VoiceNote): Promise<any> {
  const response = await fetch(`${API_BASE}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'memo',
      title: note.title,
      raw_content: note.text,
      source: 'saynote',
      tags: note.tags || ['语音']
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// 使用
try {
  const result = await syncVoiceNote({
    text: '这是语音转文字的内容',
    title: '语音笔记',
    tags: ['语音', '待办']
  });
  console.log('同步成功:', result);
} catch (error) {
  console.error('同步失败:', error);
}
```

## 错误处理

### 常见错误码

- `400`: 请求参数错误（如缺少必需字段）
- `500`: 服务器内部错误

### 错误响应格式

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

## 最佳实践

1. **异步处理**: 语音转文字和API调用都应该是异步的，避免阻塞UI
2. **错误重试**: 网络失败时实现重试机制（最多3次）
3. **离线队列**: 如果网络不可用，将笔记保存到本地队列，稍后同步
4. **标题生成**: 如果用户没有提供标题，可以从内容前20个字符自动生成
5. **标签建议**: 可以根据内容自动添加标签（如"待办"、"灵感"等）

## 测试

可以使用 curl 测试 API：

```bash
curl -X POST https://your-app.railway.app/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "type": "memo",
    "title": "测试笔记",
    "raw_content": "这是测试内容",
    "source": "saynote",
    "tags": ["测试"]
  }'
```






