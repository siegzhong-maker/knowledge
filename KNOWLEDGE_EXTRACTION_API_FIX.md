# 知识提取 API 修复说明

## 问题

点击"提取知识"时出现 `请求的资源不存在` 错误，因为：
- 前端调用 `/api/knowledge/extract` 和 `/api/knowledge/extract/:extractionId/status`
- `netlify/functions/` 目录下缺少 `knowledge.js` 函数
- `netlify.toml` 中缺少 `/api/knowledge/*` 重定向规则

## ✅ 已完成的修复

### 1. 创建了提取任务状态表

**文件**: `supabase/migrations/002_extraction_tasks.sql`

在 Supabase 中创建了 `extraction_tasks` 表，用于存储知识提取任务的状态。由于 Netlify Functions 是无状态的，任务状态必须存储在数据库中。

**执行步骤**：
1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 执行 `supabase/migrations/002_extraction_tasks.sql` 中的 SQL 脚本

### 2. 创建了知识提取 Netlify Function

**文件**: `netlify/functions/knowledge.js`

实现了以下端点：
- `POST /api/knowledge/extract` - 启动知识提取任务
- `GET /api/knowledge/extract/:extractionId/status` - 获取提取状态

**关键特性**：
- 使用 Supabase 数据库存储任务状态（替代内存 Map）
- 异步执行提取任务（不阻塞响应）
- 支持进度更新和 ETA 计算

### 3. 配置了路由重定向

**文件**: `netlify.toml`

添加了 `/api/knowledge/*` 到 `/.netlify/functions/knowledge/:splat` 的重定向规则。

## ⚠️ 重要配置要求

### 环境变量配置

知识提取功能需要以下环境变量：

1. **必需的环境变量**：
   - `SUPABASE_URL` - Supabase 项目 URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase Service Role Key

2. **可选但推荐的环境变量**：
   - `DATABASE_URL` - Supabase PostgreSQL 连接字符串
     - 格式：`postgresql://postgres.[PROJECT_REF]:[PASSWORD]@[HOST]:[PORT]/postgres`
     - 可以从 Supabase Dashboard > Settings > Database > Connection string 获取
   - 或者 `SUPABASE_DB_PASSWORD` - Supabase 数据库密码（用于自动构建连接字符串）

### 如何获取 Supabase 连接字符串

1. 打开 Supabase Dashboard
2. 进入项目 > Settings > Database
3. 在 "Connection string" 部分，选择 "URI" 或 "Connection pooling"
4. 复制连接字符串（格式：`postgresql://postgres.[PROJECT_REF]:[PASSWORD]@...`）
5. 在 Netlify Dashboard 中设置 `DATABASE_URL` 环境变量

### 在 Netlify 中配置环境变量

1. 打开 Netlify Dashboard
2. 进入项目 > Site settings > Environment variables
3. 添加以下变量：
   - `DATABASE_URL` = `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@...`
   - 或者 `SUPABASE_DB_PASSWORD` = `你的数据库密码`

## 🔧 技术细节

### 任务状态存储

任务状态存储在 `extraction_tasks` 表中，包含：
- `id` - 提取任务ID（格式：ext-xxxxx）
- `status` - 任务状态（processing, completed, failed）
- `stage` - 当前阶段（parsing, extracting, summarizing, saving）
- `progress` - 进度百分比（0-100）
- `knowledge_item_ids` - 已提取的知识点ID数组（JSONB）
- `knowledge_items` - 已提取的知识点详情（JSONB）
- `progress_history` - 进度历史记录（用于计算ETA）

### 异步执行

由于 Netlify Functions 有超时限制（免费版 10 秒，Pro 版 26 秒），知识提取任务需要异步执行：
1. API 立即返回 `extractionId`
2. 提取任务在后台异步执行
3. 前端通过轮询 `/api/knowledge/extract/:extractionId/status` 获取进度

### 长时间任务处理

**注意**：如果提取任务需要很长时间（超过 Netlify Function 超时限制），可能需要：
1. 使用 Netlify Background Functions（如果可用）
2. 或者将提取任务委托给外部服务（如 Supabase Edge Functions）
3. 或者使用队列服务（如 Supabase Queue）

## 📝 下一步

1. **执行数据库迁移**：
   - 在 Supabase SQL Editor 中执行 `supabase/migrations/002_extraction_tasks.sql`

2. **配置环境变量**：
   - 在 Netlify Dashboard 中设置 `DATABASE_URL` 或 `SUPABASE_DB_PASSWORD`

3. **部署代码**：
   - 提交并推送代码到 GitHub
   - Netlify 会自动重新部署

4. **测试功能**：
   - 打开应用
   - 上传一个 PDF 文档
   - 点击"提取知识"按钮
   - 检查是否能够启动提取并查询状态

## 🐛 故障排查

### 问题：提取任务启动失败

**可能原因**：
- `DATABASE_URL` 环境变量未设置或格式错误
- Supabase 数据库连接失败

**解决方法**：
1. 检查 Netlify 环境变量中的 `DATABASE_URL`
2. 确认 Supabase 数据库密码正确
3. 查看 Netlify Function 日志中的错误信息

### 问题：提取任务状态查询返回 404

**可能原因**：
- `extraction_tasks` 表未创建
- 任务ID不存在

**解决方法**：
1. 确认已在 Supabase 中执行 `002_extraction_tasks.sql`
2. 检查任务ID是否正确

### 问题：提取任务超时

**可能原因**：
- Netlify Function 超时限制（免费版 10 秒）
- 提取任务需要很长时间

**解决方法**：
1. 考虑使用 Netlify Pro 版本（26 秒超时）
2. 或者将长时间任务移到外部服务处理

## 📚 相关文件

- `netlify/functions/knowledge.js` - 知识提取 API 实现
- `supabase/migrations/002_extraction_tasks.sql` - 提取任务状态表
- `netlify.toml` - Netlify 配置（包含重定向规则）
- `backend/services/knowledge-extractor.js` - 知识提取服务（被 knowledge.js 调用）

