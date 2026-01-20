# 调试路由和提取失败问题

## 问题分析

从控制台错误来看，有两个主要问题：

1. **"路由不存在"错误**：`GET /api/knowledge/items` 仍然返回 404
2. **提取失败**：提取任务状态为 `failed`

## 可能的原因

### 1. 代码未部署到 Netlify

**检查方法**：
1. 确认代码已推送到 GitHub
2. 在 Netlify Dashboard 中查看最近的部署记录
3. 确认 `netlify/functions/knowledge.js` 文件已部署

**解决方法**：
```bash
git push origin main
```

### 2. 路径匹配问题

Netlify 的重定向规则可能有问题。检查：

1. **netlify.toml** 中的重定向规则：
   ```toml
   [[redirects]]
     from = "/api/knowledge/*"
     to = "/.netlify/functions/knowledge/:splat"
     status = 200
     force = true
   ```

2. **路径解析逻辑**：
   - 前端调用：`/api/knowledge/items`
   - Netlify 重定向到：`/.netlify/functions/knowledge/items`
   - Function 解析后应该是：`/items`

### 3. 提取失败的原因

从日志看，提取任务状态为 `failed`，可能原因：

1. **DATABASE_URL 未配置**
   - 知识提取需要直接连接 PostgreSQL
   - 检查 Netlify 环境变量中是否有 `DATABASE_URL`

2. **extraction_tasks 表未创建**
   - 在 Supabase SQL Editor 中执行 `002_extraction_tasks.sql`

3. **知识提取服务无法启动**
   - 检查 Netlify Function 日志中的错误信息

## 调试步骤

### 步骤 1：检查 Netlify 部署状态

1. 打开 Netlify Dashboard
2. 进入项目 > Deploys
3. 查看最新的部署是否成功
4. 确认 `netlify/functions/knowledge.js` 在部署中

### 步骤 2：检查 Netlify Function 日志

1. 打开 Netlify Dashboard
2. 进入项目 > Functions > knowledge
3. 查看最近的调用日志
4. 查找：
   - 路径解析日志：`[Knowledge Function] 解析后的路径:`
   - 错误信息

### 步骤 3：测试 API 端点

在浏览器控制台中执行：

```javascript
// 测试知识列表 API
fetch('/api/knowledge/items')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// 测试提取 API
fetch('/api/knowledge/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ itemIds: ['test-id'] })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### 步骤 4：检查环境变量

在 Netlify Dashboard 中确认：
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `DATABASE_URL` ⚠️ **必需，用于知识提取**

### 步骤 5：检查 Supabase 表

在 Supabase SQL Editor 中执行：

```sql
-- 检查 extraction_tasks 表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'extraction_tasks'
);

-- 如果不存在，执行迁移脚本
-- 复制 supabase/migrations/002_extraction_tasks.sql 的内容并执行
```

## 快速修复

### 如果代码未部署：

```bash
# 1. 确认所有更改已提交
git status

# 2. 推送到 GitHub
git push origin main

# 3. 等待 Netlify 自动部署（通常 1-2 分钟）
```

### 如果路径匹配有问题：

检查 `netlify/functions/knowledge.js` 中的路径解析逻辑，确保：
- `/api/knowledge/items` → 解析为 `/items`
- `/api/knowledge/extract/xxx/status` → 解析为 `/extract/xxx/status`

### 如果提取失败：

1. **配置 DATABASE_URL**：
   - 参考 `GET_SUPABASE_DATABASE_URL.md`
   - 在 Netlify Dashboard 中添加环境变量

2. **创建 extraction_tasks 表**：
   - 在 Supabase SQL Editor 中执行 `002_extraction_tasks.sql`

3. **检查 Netlify Function 日志**：
   - 查看具体的错误信息
   - 可能是数据库连接失败、表不存在等

## 验证修复

修复后，应该看到：

1. **知识列表可以加载**：
   - 控制台不再有"路由不存在"错误
   - 知识库页面显示数据（即使为空）

2. **提取任务可以启动**：
   - 点击"提取知识"后，任务状态为 `processing`
   - 可以通过状态 API 查询进度

3. **Netlify Function 日志正常**：
   - 有路径解析日志
   - 没有数据库连接错误

