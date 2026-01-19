# 下一步操作清单

## ✅ 已完成

1. ✅ Supabase 项目创建
2. ✅ 数据库表初始化（9个表）
3. ✅ Storage Bucket 创建（uploads）
4. ✅ Netlify 部署成功
5. ✅ 环境变量配置（SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NODE_ENV）
6. ✅ 代码修复（文件上传、知识库检查逻辑）

## 📋 接下来需要做的

### 步骤 1：初始化知识库和模块（必须）

**在 Supabase SQL Editor 中执行**：

1. **执行 `INIT_DEFAULT_KNOWLEDGE_BASE.sql`**
   - 创建"十步创业"知识库
   - 设置为默认知识库

2. **执行 `INIT_TEN_STEP_MODULES.sql`**
   - 创建6步17关的模块结构

**验证**：
- 刷新应用页面
- "未找到知识库"警告应该消失
- 应该能看到"十步创业"知识库

### 步骤 2：配置 Supabase Anon Key（用于文件上传）

**获取 Anon Key**：
1. 访问 Supabase Dashboard > Settings > API
2. 找到 "anon" "public" key
3. 点击 "Reveal" 显示完整 key
4. 复制 key

**配置方法**：
编辑 `frontend/index.html`，找到：
```javascript
window.SUPABASE_ANON_KEY = null; // 需要配置
```
替换为：
```javascript
window.SUPABASE_ANON_KEY = '您复制的 anon key';
```

**验证**：
- 配置后刷新页面
- 尝试上传一个 PDF 文件
- 应该可以成功上传

### 步骤 3：提交并推送代码

```bash
git add .
git commit -m "Fix: improve Supabase integration and knowledge base initialization"
git push origin main
```

推送后，Netlify 会自动重新部署。

### 步骤 4：测试应用功能

1. **测试文件上传**
   - 上传一个 PDF 文件
   - 确认文件成功上传到 Supabase Storage
   - 确认文档记录已创建

2. **测试知识库功能**
   - 确认能看到"十步创业"知识库
   - 确认能看到6步17关的模块结构

3. **测试知识提取**
   - 上传文档后，尝试提取知识点
   - 确认知识点能正常提取和显示

4. **测试智能问答**
   - 在智能问答页面提问
   - 确认 AI 能基于知识库回答

## 🎯 优先级

**高优先级（必须完成）**：
1. ⭐ 初始化知识库和模块（步骤 1）
2. ⭐ 配置 Supabase anon key（步骤 2）

**中优先级（建议完成）**：
3. 提交并推送代码（步骤 3）
4. 测试应用功能（步骤 4）

## 📝 快速参考

**Supabase 信息**：
- URL: `https://qrpexoehzbdfbzgzvwsc.supabase.co`
- Service Role Key: `sb_secret_kwK8Py_1bL5yfrBVeVHgcg_u6C8LJ7d`
- Anon Key: 需要从 Dashboard 获取

**SQL 脚本位置**：
- `INIT_DEFAULT_KNOWLEDGE_BASE.sql` - 创建知识库
- `INIT_TEN_STEP_MODULES.sql` - 创建模块结构

**配置文件**：
- `frontend/index.html` - 需要配置 SUPABASE_ANON_KEY

## 💡 提示

- 执行 SQL 脚本后，立即刷新应用页面查看效果
- 配置 anon key 后，文件上传功能才能正常工作
- 如果遇到问题，查看浏览器控制台的错误信息

