# 修复"提取任务不存在"错误

## 问题描述

点击"提取知识"后：
1. ✅ 提取任务创建成功（返回 `extractionId`）
2. ❌ 查询任务状态时返回"提取任务不存在"

## 根本原因

**最可能的原因：`extraction_tasks` 表未创建**

当 `updateTaskStatus` 尝试插入任务记录时，如果表不存在，插入会失败，但错误可能被静默忽略。

## ✅ 已修复

1. **改进了错误处理**：
   - 添加了详细的错误日志
   - 如果表不存在，会抛出明确的错误信息
   - 在任务创建时立即写入数据库，确保状态查询可以找到任务

2. **改进了任务创建流程**：
   - 在返回响应前先创建任务记录
   - 确保任务记录存在后再异步执行提取

## 🔧 立即修复步骤

### 步骤 1：创建 extraction_tasks 表（必需）

在 Supabase SQL Editor 中执行：

```sql
-- 复制 supabase/migrations/002_extraction_tasks.sql 的内容并执行
```

或者直接执行：

```sql
CREATE TABLE IF NOT EXISTS extraction_tasks (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'processing',
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  extracted_count INTEGER DEFAULT 0,
  knowledge_item_ids JSONB DEFAULT '[]'::jsonb,
  knowledge_items JSONB DEFAULT '[]'::jsonb,
  stage TEXT DEFAULT 'parsing',
  progress INTEGER DEFAULT 0,
  current_doc_index INTEGER DEFAULT 0,
  error TEXT,
  error_details JSONB,
  progress_history JSONB DEFAULT '[]'::jsonb,
  start_time BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_extraction_tasks_status ON extraction_tasks(status);
CREATE INDEX IF NOT EXISTS idx_extraction_tasks_created_at ON extraction_tasks(created_at DESC);
```

### 步骤 2：验证表已创建

在 Supabase SQL Editor 中执行：

```sql
-- 检查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'extraction_tasks'
);

-- 查看表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'extraction_tasks';
```

### 步骤 3：推送代码并部署

```bash
git push origin main
```

等待 Netlify 自动部署（1-2 分钟）

### 步骤 4：测试

1. 刷新应用页面
2. 点击"提取知识"按钮
3. 检查是否还有"提取任务不存在"错误

## 🔍 验证修复

### 方法 1：检查 Netlify Function 日志

1. 打开 Netlify Dashboard
2. 进入项目 > Functions > knowledge
3. 查看最近的调用日志
4. 应该看到：
   - `[Knowledge] ✅ 任务记录已创建`
   - `[Knowledge] ✅ 任务创建成功`

如果没有看到这些日志，或者看到错误，检查：
- `❌ 创建任务失败` - 可能是表不存在
- `❌ extraction_tasks 表不存在` - 需要执行迁移脚本

### 方法 2：检查 Supabase 数据库

在 Supabase SQL Editor 中执行：

```sql
-- 查看最近创建的任务
SELECT id, status, stage, created_at
FROM extraction_tasks
ORDER BY created_at DESC
LIMIT 5;
```

如果查询返回空结果，说明表可能不存在或没有数据。

### 方法 3：测试 API

在浏览器控制台中执行：

```javascript
// 1. 创建提取任务
fetch('/api/knowledge/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    itemIds: ['test-id'],
    knowledgeBaseId: 'kb-default'
  })
})
.then(r => r.json())
.then(data => {
  console.log('提取任务创建:', data);
  const extractionId = data.data?.extractionId;
  
  // 2. 立即查询状态
  if (extractionId) {
    setTimeout(() => {
      fetch(`/api/knowledge/extract/${extractionId}/status`)
        .then(r => r.json())
        .then(status => {
          console.log('任务状态:', status);
          if (status.data) {
            console.log('✅ 任务存在，状态:', status.data.status);
          } else {
            console.error('❌ 任务不存在');
          }
        });
    }, 1000);
  }
});
```

## 🐛 常见问题

### 问题 1：表已创建，但仍然报错

**可能原因**：
- 代码未部署到 Netlify
- Netlify Function 缓存问题

**解决方法**：
1. 确认代码已推送到 GitHub
2. 在 Netlify Dashboard 中手动触发重新部署
3. 清除浏览器缓存

### 问题 2：表创建失败

**错误信息**：`permission denied` 或 `relation already exists`

**解决方法**：
1. 确认使用 Supabase SQL Editor（有完整权限）
2. 如果表已存在，使用 `CREATE TABLE IF NOT EXISTS` 不会报错
3. 检查 Supabase 项目权限

### 问题 3：任务创建成功，但查询时找不到

**可能原因**：
- 任务记录创建和查询之间有延迟
- 数据库写入延迟

**解决方法**：
1. 前端轮询时增加延迟（已实现）
2. 检查 Netlify Function 日志中的时间戳
3. 确认 Supabase 数据库响应正常

## 📝 检查清单

- [ ] `extraction_tasks` 表已创建
- [ ] 表结构正确（包含所有必需字段）
- [ ] 代码已推送到 GitHub
- [ ] Netlify 已部署最新代码
- [ ] Netlify Function 日志显示任务创建成功
- [ ] Supabase 数据库中可以查询到任务记录

## 🎯 预期结果

修复后：
1. ✅ 点击"提取知识"后，任务立即创建
2. ✅ 状态查询可以找到任务
3. ✅ 任务状态正确更新
4. ✅ 不再出现"提取任务不存在"错误

