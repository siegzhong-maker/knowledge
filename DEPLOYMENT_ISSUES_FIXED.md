# 部署问题修复总结

## ✅ 已修复

### 1. 文件上传功能
- **问题**：Netlify Functions 不支持大文件上传
- **解决**：更新前端代码，使用 Supabase Storage 客户端直接上传
- **文件修改**：
  - `frontend/js/api.js` - 更新上传逻辑
  - `frontend/js/supabase-client.js` - 新增 Supabase 客户端工具
  - `frontend/index.html` - 添加 Supabase JS 库

### 2. netlify.toml 配置错误
- **问题**：`functions.timeout = 26` 格式不正确
- **解决**：移除 timeout 配置，使用默认值

## ⚠️ 需要配置

### 1. Supabase Anon Key（重要！）

**问题**：文件上传需要 Supabase anon key

**获取步骤**：
1. 访问 Supabase Dashboard：https://app.supabase.com
2. 进入项目 > Settings > API
3. 找到 "Project API keys" > "anon" "public" key
4. 复制 anon key

**配置方法**：
编辑 `frontend/index.html`，找到：
```javascript
window.SUPABASE_ANON_KEY = null; // 需要配置
```
替换为：
```javascript
window.SUPABASE_ANON_KEY = '您的 anon key';
```

**详细说明**：查看 `SUPABASE_ANON_KEY_SETUP.md`

### 2. 初始化默认知识库

**问题**：控制台显示"未找到知识库"

**解决**：需要在数据库中创建默认知识库

**方法**：
1. 在 Supabase Dashboard > Table Editor
2. 打开 `knowledge_bases` 表
3. 点击 "Insert" > "Insert row"
4. 填写：
   - `id`: `kb-default`（或使用 UUID）
   - `name`: `默认知识库`
   - `is_default`: `true`
   - `created_at`: 当前时间戳
   - `updated_at`: 当前时间戳

### 3. API 统计信息错误

**问题**：加载统计信息时出现"文档不存在"错误

**原因**：数据库中还没有数据，这是正常的

**解决**：上传文档后会自动解决

## 📋 下一步操作

1. **配置 Supabase Anon Key**
   - 获取 anon key
   - 更新 `frontend/index.html`

2. **初始化默认知识库**
   - 在 Supabase 中创建默认知识库

3. **提交并推送代码**
   ```bash
   git add .
   git commit -m "Fix file upload: use Supabase Storage directly"
   git push origin main
   ```

4. **测试文件上传**
   - 配置完 anon key 后
   - 尝试上传一个 PDF 文件
   - 应该可以正常工作

## 当前状态

- ✅ Netlify 部署成功
- ✅ 环境变量已配置
- ✅ 文件上传代码已更新
- ⏳ 需要配置 Supabase anon key
- ⏳ 需要初始化默认知识库

## 提示

- anon key 是公开的，可以安全地在前端使用
- 不要使用 service_role key 在前端（有完整权限）
- 配置完成后，应用应该可以正常工作

