# 修复 Supabase Storage RLS 策略（手动方法）

## 问题

错误信息：`new row violates row-level security policy`

这是因为 Supabase Storage 的 `uploads` bucket 启用了 Row Level Security (RLS)，但没有配置允许 anon key 上传的策略。

## 解决方案

### 方法一：使用 SQL 脚本（推荐）

1. **在 Supabase SQL Editor 中执行 `FIX_STORAGE_RLS.sql`**
   - 这会创建必要的 RLS 策略
   - 允许 anon key 上传和读取文件

### 方法二：在 Dashboard 中手动配置

1. **打开 Storage 设置**
   - Supabase Dashboard > Storage
   - 点击 `uploads` bucket

2. **配置 Policies**
   - 点击 "Policies" 标签页
   - 点击 "New Policy"

3. **创建上传策略**
   - **Policy name**: `Allow public uploads`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `anon`
   - **Policy definition**: 
     ```sql
     (bucket_id = 'uploads')
     ```
   - 点击 "Review" > "Save policy"

4. **创建读取策略**
   - **Policy name**: `Allow public read`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `anon`
   - **Policy definition**: 
     ```sql
     (bucket_id = 'uploads')
     ```
   - 点击 "Review" > "Save policy"

### 方法三：禁用 RLS（不推荐，但最简单）

如果 bucket 是 Public 的，可以临时禁用 RLS：

1. **在 Supabase SQL Editor 中执行**：
   ```sql
   ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
   ```
   
   ⚠️ **注意**：这会禁用所有 Storage 的 RLS，安全性较低，仅用于测试。

## 推荐方案

**使用 SQL 脚本（方法一）**：
- 执行 `FIX_STORAGE_RLS.sql`
- 这会创建合适的策略，既允许上传又保持一定安全性

## 验证

配置完成后：
1. 刷新应用页面
2. 尝试上传一个 PDF 文件
3. 应该可以成功上传

## 如果还是不行

1. **检查 bucket 是否为 Public**
   - Storage > uploads bucket > Settings
   - 确认 "Public bucket" 已启用

2. **检查策略是否正确创建**
   - Storage > uploads bucket > Policies
   - 应该能看到创建的策略

3. **查看详细错误**
   - 浏览器控制台中的完整错误信息
   - Supabase Dashboard > Logs

