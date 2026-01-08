# 知识提取调试查询指南

## 1. 查看后端服务器日志

### 本地开发环境

如果后端服务正在运行（通过 `npm run dev` 启动），日志会直接输出到终端控制台。

**关键日志标识符：**
- `[提取]` - 知识提取服务相关日志
- `[后端]` - 后端路由相关日志  
- `[保存]` - 数据库保存相关日志

### 过滤日志的方法

#### 方法1：使用 grep 过滤（如果日志输出到文件）
```bash
# 查看所有提取相关日志
tail -f server.log | grep "\[提取\]\|\[后端\]\|\[保存\]"

# 查看特定提取任务的日志
tail -f server.log | grep "extractionId.*ext-xxx"
```

#### 方法2：在终端中实时过滤
如果使用 `npm run dev`，日志会直接显示在终端。可以：
- 使用终端搜索功能（Cmd+F / Ctrl+F）搜索关键词
- 搜索 `[提取]`、`[后端]`、`[保存]` 等标签

### 关键日志检查点

#### 1. 提取开始阶段
查找：
```
[提取] extractKnowledgeFromContent 开始
[提取] 准备调用AI API
[提取] 调用 DeepSeek API
```

#### 2. AI响应阶段
查找：
```
[提取] AI API 调用成功
[提取] 找到JSON数组
[提取] ✅ JSON解析成功
[提取] ✅ 提取完成
```

#### 3. 保存阶段
查找：
```
[保存] 开始保存知识点
[保存] 准备插入数据库
[保存] ✅ 数据库插入成功
[提取] ✅ 知识点保存成功
[提取] 更新结果中的 knowledgeItemIds
```

#### 4. 任务完成阶段
查找：
```
[后端] 提取任务完成
[后端] 最终合并任务状态
[后端] ✅ 提取完成，已保存知识点ID
```

#### 5. 状态查询阶段
查找：
```
[后端] 提取任务状态检查
[后端] 返回提取状态响应
```

### 常见问题日志

#### 问题1：AI未返回知识点
```
[提取] ⚠️ 未提取到任何知识点
[提取] ⚠️ 响应中没有找到JSON数组
[提取] ❌ JSON解析完全失败
```

#### 问题2：保存失败
```
[保存] ❌ 数据验证失败
[保存] ❌ 数据库插入失败
[提取] ❌ 知识点保存失败
```

#### 问题3：ID收集失败
```
[提取] ❌ 警告：extractedCount > 0 但 knowledgeItemIds 为空
[提取] ⚠️ 最终结果：没有保存任何知识点ID
[后端] ⚠️ 提取完成但没有知识点ID
```

---

## 2. 通过API查询提取任务状态

### 获取提取任务ID

提取任务开始后，前端会收到 `extractionId`（格式：`ext-xxxxx`）

### 查询任务状态

```bash
# 替换 YOUR_EXTRACTION_ID 为实际的提取任务ID
curl http://localhost:3000/api/knowledge/extract/YOUR_EXTRACTION_ID/status
```

或者在浏览器中访问：
```
http://localhost:3000/api/knowledge/extract/YOUR_EXTRACTION_ID/status
```

### 响应数据结构

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "extractedCount": 5,
    "knowledgeItemIds": ["ki-xxx1", "ki-xxx2", ...],
    "knowledgeItems": [...],
    "progress": 100
  }
}
```

**关键字段：**
- `knowledgeItemIds`: 提取的知识点ID数组（用于高亮显示）
- `extractedCount`: 提取的知识点数量
- `status`: 任务状态（processing/completed/failed）

---

## 3. 直接查询数据库验证

### SQLite 数据库

数据库文件位置：`database/knowledge.db`

#### 查询最近提取的知识点
```sql
-- 查看最近创建的知识点（按时间倒序）
SELECT id, title, created_at, source_item_id, knowledge_base_id 
FROM personal_knowledge_items 
ORDER BY created_at DESC 
LIMIT 20;
```

#### 查询特定文档的知识点
```sql
-- 替换 YOUR_DOC_ID 为文档ID
SELECT id, title, content, created_at 
FROM personal_knowledge_items 
WHERE source_item_id = 'YOUR_DOC_ID'
ORDER BY created_at DESC;
```

#### 验证知识点是否存在
```sql
-- 替换 YOUR_KNOWLEDGE_ID 为知识点ID
SELECT id, title, content, status, created_at 
FROM personal_knowledge_items 
WHERE id = 'YOUR_KNOWLEDGE_ID';
```

### PostgreSQL 数据库

如果使用 PostgreSQL，连接方式类似，但需要提供连接信息。

---

## 4. 前端浏览器控制台日志

打开浏览器开发者工具（F12），在 Console 标签页中查看：

### 关键日志标识符
- `[提取]` - 前端提取相关日志
- `[知识库]` - 知识库视图相关日志

### 关键检查点

#### 1. 轮询状态响应
```
[提取] 轮询状态响应
```
查看返回的 `knowledgeItemIds` 和 `knowledgeItems`

#### 2. ID收集
```
[提取] 提取完成，开始收集知识点ID
[提取] 收集到的知识点ID
[提取] ID 转换验证
```

#### 3. localStorage 保存
```
[提取] localStorage 保存验证
[提取] ✅ 已保存本次提取高亮ID到 localStorage
```

#### 4. 错误情况
```
[提取] ❌ 没有找到知识点ID，无法保存高亮信息
```

---

## 5. 诊断脚本

可以使用现有的诊断脚本：

```bash
npm run diagnose
```

或者运行专门的提取诊断脚本（如果存在）：
```bash
node backend/scripts/diagnose-extraction.js
```

---

## 6. 快速诊断流程

### 步骤1：检查提取是否开始
在后端日志中查找：
```
[提取API] 接收提取请求
[提取] extractKnowledgeFromContent 开始
```

### 步骤2：检查AI是否返回数据
在后端日志中查找：
```
[提取] ✅ JSON解析成功
[提取] ✅ 提取完成
extractedCount: X
```

### 步骤3：检查知识点是否保存
在后端日志中查找：
```
[保存] ✅ 数据库插入成功
[提取] ✅ 知识点保存成功
knowledgeItemId: ki-xxx
```

### 步骤4：检查ID是否收集
在后端日志中查找：
```
[提取] 更新结果中的 knowledgeItemIds
totalKnowledgeItemIdsCount: X
```

### 步骤5：检查任务完成状态
在后端日志中查找：
```
[后端] ✅ 提取完成，已保存知识点ID
knowledgeItemIdsCount: X
```

### 步骤6：检查前端接收
在前端控制台查找：
```
[提取] 轮询状态响应
knowledgeItemIds: [...]
```

---

## 7. 常见问题排查

### 问题：extractedCount > 0 但 knowledgeItemIds 为空

**可能原因：**
1. 知识点保存失败，但计数增加了
2. ID收集逻辑有问题
3. 数据在传递过程中丢失

**排查方法：**
1. 检查后端日志中的 `[保存] ❌ 数据库插入失败`
2. 检查 `[提取] 批次保存结果` 中的 success/failed 数量
3. 直接查询数据库验证知识点是否存在

### 问题：前端收到空数组

**可能原因：**
1. 后端任务状态中 knowledgeItemIds 为空
2. 数据序列化/反序列化问题
3. 前端解析逻辑问题

**排查方法：**
1. 通过API直接查询任务状态
2. 检查前端控制台的完整响应数据
3. 验证数据类型（应该是数组）

---

## 8. 日志级别说明

- `✅` - 成功操作
- `⚠️` - 警告（可能有问题但不影响流程）
- `❌` - 错误（操作失败）

---

## 9. 实时监控建议

在提取过程中，可以同时打开：
1. 后端终端窗口 - 查看服务器日志
2. 浏览器控制台 - 查看前端日志
3. 数据库查询工具 - 实时验证数据保存

这样可以快速定位问题出现在哪个环节。

