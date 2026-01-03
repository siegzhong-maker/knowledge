# Railway 部署指南

你已经创建了 Railway 项目，现在需要配置环境变量并完成部署。

## 你的 Railway 项目信息

- **项目 URL**: https://railway.com/project/88699968-0735-4804-b94d-339b573b7c99
- **服务 URL**: https://railway.com/project/88699968-0735-4804-b94d-339b573b7c99/service/ccac642b-3bbf-410b-ae54-59b9c19bf6c5/variables

## 部署步骤

### 1. 连接 GitHub 仓库（如果还没连接）

1. 在 Railway 项目页面
2. 点击你的服务（service）
3. 点击 "Settings" 标签
4. 在 "Source" 部分，点击 "Connect GitHub"
5. 选择仓库：`siegzhong-maker/knowledge`
6. 选择分支：`main`
7. 保存设置

### 2. 确保使用 Node.js 20

⚠️ **重要**：应用需要 Node.js 20+。项目已包含 `nixpacks.toml` 文件来指定 Node.js 20。

如果部署仍然失败，请：
1. 确保代码已提交到 GitHub（包含 `nixpacks.toml`）
2. Railway 会自动使用正确的 Node.js 版本
3. 参考 [RAILWAY_FIX_NODE_VERSION.md](./RAILWAY_FIX_NODE_VERSION.md) 获取详细说明

### 3. 配置环境变量

你已经打开了环境变量配置页面。现在需要添加以下环境变量：

#### 必需的环境变量

1. **NODE_VERSION**（重要 - 解决部署错误）
   - 点击 "New Variable" 或 "+" 按钮
   - **Name**: `NODE_VERSION`
   - **Value**: `20`
   - 点击 "Add" 保存
   
   ⚠️ **必须配置**：应用需要 Node.js 20+ 版本

2. **DATABASE_URL**（最重要）
   - 点击 "New Variable" 或 "+" 按钮
   - **Name**: `DATABASE_URL`
   - **Value**: `postgresql://postgres:Zhong%40123ch@db.eibgzxvspsdlkrwwiqjx.supabase.co:5432/postgres`
   - 点击 "Add" 保存

   ⚠️ **注意**：密码中的 `@` 已编码为 `%40`

3. **NODE_ENV**（推荐）
   - 点击 "New Variable"
   - **Name**: `NODE_ENV`
   - **Value**: `production`
   - 点击 "Add" 保存

4. **CORS_ORIGIN**（可选）
   - 如果需要限制 CORS 来源，添加此变量
   - **Name**: `CORS_ORIGIN`
   - **Value**: `*` 或具体域名
   - 点击 "Add" 保存

#### 环境变量配置清单

确保以下环境变量已配置：

- ✅ `NODE_VERSION` - Node.js 版本（必须设置为 `20`）
- ✅ `DATABASE_URL` - Supabase PostgreSQL 连接字符串
- ✅ `NODE_ENV` - 生产环境标识
- ⚠️ `CORS_ORIGIN` - CORS 配置（可选）

### 3. 配置服务设置

1. 在服务页面，点击 "Settings" 标签
2. 检查以下配置：

   **基础配置：**
   - **Start Command**: `npm start`（Railway 通常会自动检测）
   - **Healthcheck Path**: `/api/health`（可选，但推荐）

   **资源限制：**
   - Railway 免费套餐提供 $5/月额度
   - 对于小型应用，默认资源通常足够

### 4. 部署应用

Railway 会自动：
- 从 GitHub 拉取代码
- 运行 `npm install` 安装依赖
- 运行 `npm start` 启动应用
- 数据库会自动初始化（通过 `postinstall` 脚本）

### 5. 查看部署日志

1. 在服务页面，点击 "Deployments" 标签
2. 查看最新的部署日志
3. 确认以下信息：
   - ✅ 构建成功
   - ✅ 依赖安装成功
   - ✅ 应用启动成功
   - ✅ 数据库连接成功

### 6. 获取应用 URL

1. 在服务页面，点击 "Settings" 标签
2. 在 "Domains" 部分，你会看到：
   - Railway 提供的默认域名（如：`your-app.up.railway.app`）
   - 可以点击生成或查看域名

3. 访问你的应用：
   - **Web前端**: `https://your-app.up.railway.app`
   - **API端点**: `https://your-app.up.railway.app/api`
   - **健康检查**: `https://your-app.up.railway.app/api/health`

### 7. 验证部署

1. **检查健康检查端点**
   ```bash
   curl https://your-app.up.railway.app/api/health
   ```
   应该返回：`{"success":true,"message":"服务运行正常"}`

2. **检查数据库连接**
   - 查看部署日志，应该看到：
     - `✓ 已连接到PostgreSQL数据库`
     - `✓ PostgreSQL数据库初始化完成`

3. **测试应用功能**
   - 访问应用 URL
   - 尝试创建知识项
   - 确认数据保存成功

## 数据库初始化

数据库会在首次部署时自动初始化（通过 `postinstall` 脚本运行 `npm run init-db`）。

如果需要手动初始化：

1. 在服务页面，点击 "Deployments" 标签
2. 找到最新的部署
3. 点击 "View Logs"
4. 查找初始化日志

或者通过 Railway CLI：

```bash
# 安装 Railway CLI（如果还没安装）
npm i -g @railway/cli

# 登录
railway login

# 链接到项目
railway link

# 运行初始化脚本
railway run npm run init-db
```

## 环境变量配置详情

### DATABASE_URL 格式

```
postgresql://postgres:密码@主机:端口/数据库名
```

你的完整连接字符串：
```
postgresql://postgres:Zhong%40123ch@db.eibgzxvspsdlkrwwiqjx.supabase.co:5432/postgres
```

**重要提示：**
- 密码 `Zhong@123ch` 中的 `@` 必须编码为 `%40`
- Railway 环境变量中直接粘贴编码后的字符串

### 环境变量位置

在 Railway 中，环境变量可以在多个级别配置：

1. **服务级别**（推荐）
   - 在服务页面 → Variables 标签
   - 只影响当前服务

2. **项目级别**
   - 在项目设置中配置
   - 所有服务共享

你当前在服务级别的环境变量页面，这是正确的位置。

## Railway 免费套餐说明

Railway 提供：
- ✅ $5/月免费额度
- ✅ 需要绑定信用卡（但免费额度内不扣费）
- ✅ 自动 HTTPS
- ✅ 自定义域名支持
- ✅ 环境变量管理
- ✅ 日志查看
- ✅ 无休眠机制（服务持续运行）

**资源使用：**
- 小型 Node.js 应用通常每月使用 $1-3
- $5 免费额度通常足够个人项目使用

## 故障排查

### 部署失败

1. **检查构建日志**
   - 查看部署日志中的错误信息
   - 确认 `npm install` 成功
   - 确认所有依赖正确安装

2. **检查环境变量**
   - 确认 DATABASE_URL 正确配置
   - 验证密码编码正确（`@` → `%40`）

### 数据库连接失败

1. **检查 DATABASE_URL**
   - 在环境变量页面确认值正确
   - 检查密码编码
   - 验证 Supabase 项目状态

2. **查看应用日志**
   - 在服务页面 → "Logs" 标签
   - 查找数据库连接错误

3. **测试连接字符串**
   - 可以在本地测试连接字符串是否有效
   - 使用 `psql` 或数据库客户端测试

### 应用无法访问

1. **检查服务状态**
   - 在服务页面查看服务状态
   - 确认服务处于 "Active" 状态

2. **检查域名配置**
   - 确认域名已正确配置
   - 检查 HTTPS 证书状态

3. **查看日志**
   - 检查应用启动日志
   - 查找错误信息

## 自动部署

Railway 默认会：
- ✅ 监听 GitHub 仓库的 push 事件
- ✅ 自动触发重新部署
- ✅ 保持应用与代码同步

每次推送代码到 GitHub 的 `main` 分支，Railway 会自动部署。

## 自定义域名（可选）

1. 在服务页面 → "Settings" 标签
2. 在 "Domains" 部分
3. 点击 "Generate Domain" 或 "Add Custom Domain"
4. 按照提示配置 DNS 记录

## 监控和日志

### 查看日志

1. 在服务页面，点击 "Logs" 标签
2. 实时查看应用日志
3. 可以搜索和过滤日志

### 查看指标

在服务页面可以看到：
- CPU 使用率
- 内存使用率
- 网络流量
- 请求统计

## 下一步

配置完成后：

1. ✅ 添加 DATABASE_URL 环境变量
2. ✅ Railway 自动部署应用
3. ✅ 等待部署完成（2-5分钟）
4. ✅ 访问应用 URL 测试功能
5. ✅ 验证数据库连接和功能正常

## 相关文档

- [Supabase 设置指南](./SUPABASE_SETUP.md)
- [数据库连接字符串配置](./RENDER_DATABASE_SETUP.md)
- [完整部署指南](./DEPLOY.md)

