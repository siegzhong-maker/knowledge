# 修复提取失败问题

## 问题描述

点击"提取知识"时出现以下错误：
1. **提取任务失败**：状态显示 `status: 'failed'` 和 `stage: 'failed'`
2. **知识列表加载失败**：`API请求失败: Error:路由不存在`

## ✅ 已修复

### 1. 添加了知识列表 API

**文件**: `netlify/functions/knowledge.js`

添加了 `GET /api/knowledge/items` 端点，支持：
- 按知识库、状态、分类、标签、搜索过滤
- 分页和排序
- 包含子分类信息

### 2. 修复了响应格式

确保所有 API 响应都正确包装在 `data` 字段中。

## ⚠️ 提取任务失败的可能原因

### 1. DATABASE_URL 未配置

**症状**：提取任务启动后立即失败，状态为 `failed`

**解决方法**：
1. 在 Netlify Dashboard 中配置 `DATABASE_URL` 环境变量
2. 格式：`postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`
3. 参考 `GET_SUPABASE_DATABASE_URL.md` 获取连接字符串

### 2. extraction_tasks 表未创建

**症状**：提取任务无法保存状态

**解决方法**：
1. 在 Supabase SQL Editor 中执行 `supabase/migrations/002_extraction_tasks.sql`
2. 确认表已创建成功

### 3. 知识提取服务依赖问题

**症状**：提取任务启动失败，日志显示模块加载错误

**可能原因**：
- `backend/services/knowledge-extractor.js` 无法访问
- `backend/services/ai.js` 无法访问
- 数据库连接失败

**解决方法**：
1. 确认 `DATABASE_URL` 环境变量已正确配置
2. 检查 Netlify Function 日志中的错误信息
3. 确认所有依赖都已正确安装

### 4. Netlify Function 超时

**症状**：提取任务启动成功，但很快失败

**可能原因**：
- Netlify Functions 免费版超时限制为 10 秒
- 知识提取是长时间任务，可能超过超时限制

**解决方法**：
1. 升级到 Netlify Pro（26 秒超时）
2. 或者将长时间任务移到外部服务处理（如 Supabase Edge Functions）

## 🔍 调试步骤

### 1. 检查 Netlify Function 日志

1. 打开 Netlify Dashboard
2. 进入项目 > Functions > knowledge
3. 查看最近的调用日志
4. 查找错误信息

### 2. 检查 Supabase 数据库

在 Supabase SQL Editor 中执行：

```sql
-- 检查 extraction_tasks 表是否存在
SELECT * FROM extraction_tasks ORDER BY created_at DESC LIMIT 5;

-- 检查最近的任务状态
SELECT id, status, stage, error, created_at 
FROM extraction_tasks 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. 检查环境变量

在 Netlify Dashboard 中确认以下环境变量已配置：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`（必需，用于知识提取）

### 4. 测试 API 端点

使用浏览器或 curl 测试：

```bash
# 测试知识列表 API
curl https://your-site.netlify.app/api/knowledge/items

# 测试提取 API
curl -X POST https://your-site.netlify.app/api/knowledge/extract \
  -H "Content-Type: application/json" \
  -d '{"itemIds": ["test-id"], "knowledgeBaseId": "kb-default"}'
```

## 📝 下一步

1. **配置 DATABASE_URL**：
   - 参考 `GET_SUPABASE_DATABASE_URL.md` 获取连接字符串
   - 在 Netlify Dashboard 中配置环境变量

2. **创建 extraction_tasks 表**：
   - 在 Supabase SQL Editor 中执行 `supabase/migrations/002_extraction_tasks.sql`

3. **推送代码并部署**：
   ```bash
   git push origin main
   ```
   - 等待 Netlify 自动部署

4. **测试功能**：
   - 刷新应用页面
   - 点击"提取知识"按钮
   - 检查控制台和 Netlify Function 日志

## 🐛 常见错误

### 错误：`Cannot destructure property 'extractionId' of 'response.data' as it is undefined`

**原因**：API 响应格式不正确

**已修复**：✅ 响应格式已修复，数据现在正确包装在 `data` 字段中

### 错误：`路由不存在`

**原因**：`GET /api/knowledge/items` 端点未实现

**已修复**：✅ 已添加知识列表 API 端点

### 错误：提取任务状态为 `failed`

**可能原因**：
1. `DATABASE_URL` 未配置
2. `extraction_tasks` 表未创建
3. 知识提取服务无法连接数据库
4. Netlify Function 超时

**解决方法**：按照上面的调试步骤逐一检查

