# 🔴 紧急修复清单

## 问题总结

从截图和错误信息看到以下问题：

1. ❌ **知识库未设置为默认**：控制台显示 `is_default: false`
2. ❌ **PDF 加载失败**：显示"文档不存在"和"InvalidPDFException"
3. ⚠️ **API 未配置**：这是 DeepSeek API Key，不影响文件上传

## ✅ 已修复

### 1. PDF 文件服务

**问题**：没有 Netlify Function 来处理 `/api/files/pdf/:id` 请求

**修复**：
- ✅ 创建了 `netlify/functions/files.js`
- ✅ 从 Supabase Storage 获取 PDF 文件
- ✅ 支持 Range 请求（PDF.js 分块加载）
- ✅ 更新了 `netlify.toml` 添加重定向规则

### 2. 知识库初始化

**问题**：知识库可能未正确初始化

**需要执行**：
1. 在 Supabase SQL Editor 执行 `INIT_DEFAULT_KNOWLEDGE_BASE.sql`
2. 在 Supabase SQL Editor 执行 `INIT_TEN_STEP_MODULES.sql`

## 📋 立即执行步骤

### 步骤 1：执行 SQL 脚本（必须）

在 Supabase SQL Editor 中依次执行：

1. **FIX_STORAGE_RLS.sql** - 修复文件上传权限
2. **INIT_DEFAULT_KNOWLEDGE_BASE.sql** - 创建知识库
3. **INIT_TEN_STEP_MODULES.sql** - 创建模块结构

### 步骤 2：提交并推送代码

```bash
git add .
git commit -m "Add PDF file service and fix knowledge base initialization"
git push origin main
```

### 步骤 3：验证修复

1. **刷新应用页面**
2. **检查知识库**：
   - 应该能看到"十步创业"知识库
   - 控制台应该显示 `is_default: true`
3. **测试 PDF 加载**：
   - 点击已上传的 PDF 文档
   - 应该能正常加载和显示

## 🔍 验证方法

### 检查知识库

打开浏览器控制台，应该看到：
```
成功加载知识库: 1 个
当前知识库:十步创业是否默认:true  ← 应该是 true
```

### 检查 PDF 加载

1. 点击文档列表中的 PDF
2. 应该能看到 PDF 内容（不再显示"加载失败"）
3. 控制台不应该有 "文档不存在" 错误

## ⚠️ 如果还是不行

### PDF 仍然加载失败

1. **检查文件是否上传成功**：
   - Supabase Dashboard > Storage > uploads bucket
   - 确认文件存在

2. **检查数据库记录**：
   - Supabase Dashboard > Table Editor > source_items
   - 确认 `file_path` 字段有值
   - 确认 `type` 字段是 `pdf`

3. **检查 Netlify Function 日志**：
   - Netlify Dashboard > Functions > files
   - 查看错误日志

### 知识库仍然不是默认

1. **检查数据库**：
   ```sql
   SELECT * FROM knowledge_bases WHERE is_default = true;
   ```
   - 应该返回一条记录，`is_default` 应该是 `true`

2. **如果返回空**：
   - 重新执行 `INIT_DEFAULT_KNOWLEDGE_BASE.sql`

3. **如果 `is_default` 是 `false`**：
   ```sql
   UPDATE knowledge_bases SET is_default = true WHERE id = 'kb-default';
   ```

## 📝 文件清单

- ✅ `netlify/functions/files.js` - PDF 文件服务（新建）
- ✅ `netlify.toml` - 添加了 `/api/files/*` 重定向
- ✅ `INIT_DEFAULT_KNOWLEDGE_BASE.sql` - 知识库初始化脚本
- ✅ `INIT_TEN_STEP_MODULES.sql` - 模块初始化脚本
- ✅ `FIX_STORAGE_RLS.sql` - Storage RLS 策略修复

## 🎯 完成标志

当所有步骤完成后：
- ✅ 知识库显示为默认（`is_default: true`）
- ✅ PDF 文件可以正常加载和显示
- ✅ 不再出现"文档不存在"错误
- ✅ 不再出现"加载失败"提示

