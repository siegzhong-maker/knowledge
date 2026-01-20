# 如何查看提取失败的具体原因

## 方法 1：查看 Netlify Function 日志（推荐）

1. 打开 Netlify Dashboard
2. 进入项目 > **Functions** > **knowledge**
3. 查看最近的调用日志
4. 查找以 `[Knowledge]` 开头的日志，特别是：
   - `❌ DATABASE_URL 未配置！`
   - `❌ 导入知识提取服务失败`
   - `❌ 提取任务失败`

## 方法 2：查看 Supabase 数据库中的错误信息

在 Supabase SQL Editor 中执行：

```sql
-- 查看最近的提取任务及其错误信息
SELECT 
  id,
  status,
  stage,
  error,
  error_details,
  created_at,
  updated_at
FROM extraction_tasks
ORDER BY created_at DESC
LIMIT 10;
```

**error_details** 字段包含详细的错误信息（JSON 格式），包括：
- `name`: 错误类型
- `message`: 错误消息
- `stack`: 错误堆栈（如果有）
- `solution`: 解决方案提示（如果有）

## 方法 3：通过 API 查询任务状态

在浏览器控制台中执行：

```javascript
// 替换为实际的 extractionId
const extractionId = 'ext-16a42eda';

fetch(`/api/knowledge/extract/${extractionId}/status`)
  .then(r => r.json())
  .then(data => {
    console.log('任务状态:', data);
    if (data.data && data.data.status === 'failed') {
      console.error('错误信息:', data.data.error);
      console.error('错误详情:', data.data.errorDetails);
    }
  });
```

## 常见错误及解决方法

### 错误 1: `DATABASE_URL 环境变量未配置`

**症状**：
- 任务状态立即变为 `failed`
- 错误消息：`DATABASE_URL 环境变量未配置`

**解决方法**：
1. 在 Netlify Dashboard 中配置 `DATABASE_URL` 环境变量
2. 参考 `GET_SUPABASE_DATABASE_URL.md` 获取连接字符串
3. 重新部署或触发新的提取任务

### 错误 2: `无法导入知识提取服务`

**症状**：
- 错误消息：`无法导入知识提取服务: Cannot find module`

**可能原因**：
- `backend/services/knowledge-extractor.js` 文件不存在
- 依赖模块缺失

**解决方法**：
1. 确认 `backend/services/knowledge-extractor.js` 文件存在
2. 检查 Netlify 部署日志，确认所有文件都已部署
3. 确认 `package.json` 中的依赖都已安装

### 错误 3: `数据库连接失败`

**症状**：
- 错误消息包含：`connection`, `ECONNREFUSED`, `timeout`

**解决方法**：
1. 检查 `DATABASE_URL` 格式是否正确
2. 确认 Supabase 数据库密码正确（URL 编码）
3. 检查 Supabase 数据库是否正常运行
4. 确认网络连接正常

### 错误 4: `extraction_tasks 表不存在`

**症状**：
- 错误消息：`relation "extraction_tasks" does not exist`

**解决方法**：
1. 在 Supabase SQL Editor 中执行 `supabase/migrations/002_extraction_tasks.sql`
2. 确认表已创建成功

### 错误 5: Netlify Function 超时

**症状**：
- 任务启动后很快失败
- 错误消息可能包含：`timeout`, `Function execution exceeded`

**解决方法**：
1. 升级到 Netlify Pro（26 秒超时）
2. 或者将长时间任务移到外部服务处理

## 调试步骤

1. **检查环境变量**：
   ```bash
   # 在 Netlify Dashboard 中确认
   - SUPABASE_URL ✅
   - SUPABASE_SERVICE_ROLE_KEY ✅
   - DATABASE_URL ⚠️ 必需！
   ```

2. **检查数据库表**：
   ```sql
   -- 在 Supabase SQL Editor 中执行
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_name = 'extraction_tasks'
   );
   ```

3. **查看最近的错误**：
   ```sql
   SELECT id, status, error, error_details, created_at
   FROM extraction_tasks
   WHERE status = 'failed'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **测试数据库连接**：
   - 在 Netlify Function 日志中查找 `DATABASE_URL 已配置` 日志
   - 确认连接字符串格式正确

## 快速修复检查清单

- [ ] `DATABASE_URL` 环境变量已配置
- [ ] `extraction_tasks` 表已创建
- [ ] 代码已推送到 GitHub 并部署到 Netlify
- [ ] Netlify Function 日志中没有模块导入错误
- [ ] Supabase 数据库正常运行

