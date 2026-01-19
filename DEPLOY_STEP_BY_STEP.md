# Netlify 部署步骤指南

本指南将一步一步指导您完成项目的 Netlify 部署。

## 第一步：准备 Supabase 数据库

### 1.1 创建 Supabase 项目

1. 访问 [Supabase 官网](https://supabase.com)
2. 点击右上角 **"Sign In"** 或 **"Start your project"**
3. 使用 GitHub 账号登录（推荐）或创建新账号
4. 登录后，点击 **"New Project"**
5. 填写项目信息：
   - **Name**: `knowledge-manager`（或您喜欢的名称）
   - **Database Password**: 设置一个强密码（请保存好，稍后需要）
   - **Region**: 选择离您最近的区域（如 `Southeast Asia (Singapore)`）
6. 点击 **"Create new project"**
7. 等待项目创建完成（约 2-3 分钟）

### 1.2 获取 Supabase 凭证

✅ **您已有的信息**：
- **Project URL**: `https://qrpexoehzbdfbzgzvwsc.supabase.co`
- **Database Password**: `Zhong@123a2`

📋 **现在需要获取 Secret Key**：

✅ **您已经在正确的页面了！**（API Keys 页面）

**Supabase 更新了 API Keys 系统，有两种方式**：

### 方式一：使用新的 Secret Key（推荐）⭐

在您当前页面的 **"Secret keys"** 部分：

1. 找到 **"default"** 这一行
2. 在 API Key 列中，看到被掩码的 key：`sb_secret_kwK8P............`
3. 点击 **眼睛图标** 👁️（在 key 右侧）来显示完整的 key
4. 点击 **复制图标** 📋 来复制完整的 key
5. 这个新的 `sb_secret_` key 可以替代 `service_role` key 使用！

### 方式二：获取旧的 service_role key

如果需要旧的格式：

1. 在页面顶部，点击 **"Legacy anon, service_role API keys"** 标签页
2. 找到 **"service_role"** 行
3. 点击 **"Reveal"** 按钮显示 key
4. 复制 key（通常以 `eyJ...` 开头）

⚠️ **重要**：无论使用哪种 key，都有完整权限，请妥善保存，不要分享

💡 **提示**：
- 如果左侧菜单没有 "API Keys"，尝试点击 "Settings" → 然后找 "API Keys"
- 或者直接访问：`https://app.supabase.com/project/qrpexoehzbdfbzgzvwsc/settings/api`

💡 **提示**：service_role key 看起来像这样：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycGV4b2V6YmRmYnpuZ3p2d3NjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5ODc2NTQzMCwiZXhwIjoyMDE0MzQxNDMwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 1.3 初始化数据库表

1. 在 Supabase Dashboard 左侧菜单，点击 **"SQL Editor"**
2. 点击 **"New query"**
3. 打开项目中的文件：`supabase/migrations/001_initial_schema.sql`
4. **复制整个文件内容**
5. 粘贴到 Supabase SQL Editor 中
6. 点击右上角 **"Run"** 按钮（或按 `Cmd+Enter` / `Ctrl+Enter`）
7. 等待执行完成，应该看到 "Success. No rows returned" 或类似的成功消息
8. 验证表已创建：
   - 点击左侧菜单 **"Table Editor"**
   - 应该能看到以下表：
     - `source_items`
     - `tags`
     - `settings`
     - `user_contexts`
     - `knowledge_bases`
     - `modules`
     - `personal_knowledge_items`
     - `knowledge_relations`
     - `category_subcategories`

### 1.4 创建 Storage Bucket（用于文件上传）

✅ **步骤 1.3 已完成！** 所有 9 个数据库表已创建。

📋 **现在创建 Storage Bucket**：

1. 在 Supabase Dashboard 左侧菜单，点击 **"Storage"**（文件夹图标 📁）
2. 点击 **"+ New bucket"** 或 **"Create a new bucket"** 按钮
3. 填写信息：
   - **Name**: `uploads`（推荐使用这个名称）
   - **Public bucket**: 
     - 选择 **"Public"** ⭐（推荐，文件可公开访问，适合文档）
     - 或选择 **"Private"**（如果需要权限控制）
4. 点击 **"Create bucket"** 或 **"Create"**
5. 验证 bucket 已创建：在 Storage 列表中应该能看到 `uploads` bucket，状态为 "Active"

💡 **提示**：
- 对于知识管理系统，通常使用 **Public** bucket
- Bucket 名称可以自定义，但建议使用 `uploads` 保持一致性
- 创建后可以随时修改公开/私有设置

---

## 第二步：准备 GitHub 仓库

### 2.1 确认代码已提交

1. 打开终端，进入项目目录：
   ```bash
   cd /Users/silas/Desktop/knowledge
   ```

2. 检查 Git 状态：
   ```bash
   git status
   ```

3. 如果有未提交的更改，提交它们：
   ```bash
   git add .
   git commit -m "Add Netlify deployment configuration"
   ```

4. 推送到 GitHub：
   ```bash
   git push origin main
   ```
   （如果您的默认分支是 `master`，使用 `git push origin master`）

---

## 第三步：在 Netlify 上创建站点

### 3.1 登录 Netlify

1. 访问 [Netlify 官网](https://www.netlify.com)
2. 点击右上角 **"Sign up"** 或 **"Log in"**
3. 选择 **"Sign up with GitHub"**（推荐，方便连接仓库）
4. 授权 Netlify 访问您的 GitHub 账号

### 3.2 导入项目

1. 登录后，在 Dashboard 点击 **"Add new site"**
2. 选择 **"Import an existing project"**
3. 选择 **"Deploy with GitHub"**
4. 如果首次使用，需要授权 Netlify 访问 GitHub
5. 在仓库列表中找到 `siegzhong-maker/knowledge`，点击它

### 3.3 配置构建设置

在部署配置页面，设置以下内容：

- **Branch to deploy**: `main`（或您的默认分支）
- **Base directory**: 留空
- **Build command**: 留空（前端是静态文件，无需构建）
- **Publish directory**: 输入 `frontend`

点击 **"Show advanced"** 可以查看更多选项，但通常不需要修改。

### 3.4 配置环境变量

在部署配置页面的 **"Environment variables"** 部分，点击 **"New variable"**，添加以下变量：

1. **SUPABASE_URL**
   - Key: `SUPABASE_URL`
   - Value: 从步骤 1.2 复制的 Project URL（如 `https://xxxxx.supabase.co`）

2. **SUPABASE_SERVICE_ROLE_KEY**
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: 从步骤 1.2 复制的 service_role key

3. **NODE_ENV**
   - Key: `NODE_ENV`
   - Value: `production`

4. **DEEPSEEK_API_KEY**（可选，用户可以在前端配置）
   - Key: `DEEPSEEK_API_KEY`
   - Value: 您的 DeepSeek API Key（如果有）

5. **ENCRYPTION_KEY**（可选，用于设置加密）
   - Key: `ENCRYPTION_KEY`
   - Value: 一个 32 字符的随机字符串（用于加密 API Key）

添加完所有变量后，点击 **"Deploy site"**。

---

## 第四步：等待部署完成

### 4.1 监控部署进度

1. 部署开始后，您会看到部署日志
2. 等待部署完成（通常 1-3 分钟）
3. 部署成功后，您会看到：
   - ✅ "Site is live"
   - 一个自动生成的 URL（如 `https://magnificent-quokka-afd826.netlify.app`）

### 4.2 检查部署状态

1. 在 Netlify Dashboard，点击您的站点
2. 查看 **"Deploys"** 标签页
3. 确认最新部署状态为 **"Published"**

---

## 第五步：测试部署

### 5.1 测试健康检查

1. 在浏览器中访问：`https://your-site.netlify.app/api/health`
2. 应该看到 JSON 响应：
   ```json
   {
     "success": true,
     "message": "服务运行正常",
     "timestamp": "..."
   }
   ```

### 5.2 测试前端页面

1. 访问您的站点 URL：`https://your-site.netlify.app`
2. 应该能看到应用界面
3. 尝试添加一个文档或知识项，测试基本功能

### 5.3 测试 API 端点

使用浏览器开发者工具或 Postman 测试：

1. **获取文档列表**：
   ```
   GET https://your-site.netlify.app/api/items
   ```

2. **获取设置**：
   ```
   GET https://your-site.netlify.app/api/settings
   ```

3. **获取知识库列表**：
   ```
   GET https://your-site.netlify.app/api/knowledge-bases
   ```

### 5.4 检查 Functions 日志

1. 在 Netlify Dashboard，点击您的站点
2. 点击左侧菜单 **"Functions"**
3. 查看是否有错误日志
4. 如果有错误，点击查看详细信息

---

## 第六步：配置自定义域名（可选）

### 6.1 添加自定义域名

1. 在 Netlify Dashboard，点击您的站点
2. 点击 **"Domain settings"**
3. 点击 **"Add custom domain"**
4. 输入您的域名（如 `knowledge.example.com`）
5. 按照提示配置 DNS 记录

### 6.2 配置 HTTPS

Netlify 会自动为所有域名配置 HTTPS 证书，无需手动操作。

---

## 故障排查

### 问题 1：部署失败

**可能原因**：
- 环境变量未正确配置
- 代码有语法错误
- 构建命令配置错误

**解决方法**：
1. 检查部署日志中的错误信息
2. 确认所有环境变量已正确添加
3. 检查 `netlify.toml` 配置是否正确

### 问题 2：API 返回 404

**可能原因**：
- Functions 路由配置错误
- 路径不匹配

**解决方法**：
1. 检查 `netlify.toml` 中的重定向规则
2. 确认 Functions 文件在 `netlify/functions/` 目录下
3. 查看 Functions 日志

### 问题 3：数据库连接失败

**可能原因**：
- Supabase URL 或 Key 错误
- 网络连接问题
- Supabase 项目未正确创建

**解决方法**：
1. 检查环境变量中的 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
2. 确认 Supabase 项目状态为 "Active"
3. 在 Supabase Dashboard 测试数据库连接

### 问题 4：前端无法加载

**可能原因**：
- 发布目录配置错误
- 文件路径问题

**解决方法**：
1. 确认 `netlify.toml` 中 `publish = "frontend"`
2. 确认 Netlify 构建设置中 "Publish directory" 为 `frontend`
3. 检查 `frontend/index.html` 是否存在

---

## 后续优化

### 1. 配置自动部署

默认情况下，每次推送到 GitHub 的 `main` 分支都会自动触发部署。您可以在：
- **Site settings** > **Build & deploy** > **Continuous Deployment** 中配置

### 2. 设置部署通知

在 **Site settings** > **Notifications** 中配置：
- 部署成功/失败邮件通知
- Slack 通知（如果有）

### 3. 配置环境变量分支

可以为不同分支设置不同的环境变量：
- **Site settings** > **Environment variables** > **Deploy contexts**

### 4. 查看分析数据

在 **Analytics** 标签页查看：
- 访问统计
- Functions 调用次数
- 带宽使用情况

---

## 完成！

恭喜！您的项目已经成功部署到 Netlify。现在您可以：

1. 访问您的站点使用应用
2. 继续开发新功能
3. 每次推送代码都会自动部署

如果遇到任何问题，请参考：
- [Netlify 官方文档](https://docs.netlify.com/)
- [Supabase 文档](https://supabase.com/docs)
- 项目的 `NETLIFY_DEPLOY.md` 文件

