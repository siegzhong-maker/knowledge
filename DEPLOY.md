# 部署指南

本指南提供从零开始的部署步骤，使用 Railway 平台和 Railway Postgres 数据库。

## Railway 部署（推荐）

### 前置条件

1. Railway 账号（[railway.app](https://railway.app)）
2. GitHub 账号
3. 代码已推送到 GitHub 仓库

### 步骤 1：创建 Railway 项目

1. 登录 [Railway](https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的仓库：`siegzhong-maker/knowledge`
5. 选择分支：`main`

### 步骤 2：添加 PostgreSQL 数据库

1. 在项目页面，点击 "+ New"
2. 选择 "Database" > "Add PostgreSQL"
3. Railway 会自动创建 Postgres 服务
4. 数据库会自动配置，无需手动设置连接字符串

### 步骤 3：配置应用服务

Railway 会自动检测到你的代码并创建 Web 服务。确认以下配置：

1. **服务名称**：knowledge（或自定义）
2. **构建配置**：
   - Railway 会自动使用 `Dockerfile`（项目已包含）
   - 使用 Node.js 20
3. **环境变量**：
   - Railway 会自动从 Postgres 服务注入 `DATABASE_URL`
   - 无需手动配置数据库连接
4. **启动命令**：`npm start`（已在 railway.json 中配置）

### 步骤 4：部署和验证

1. **自动部署**：
   - Railway 会自动从 GitHub 拉取代码
   - 运行构建和部署
   - 数据库表结构会自动初始化（通过 `postinstall` 脚本）

2. **查看部署日志**：
   - 在服务页面，点击 "Deployments"
   - 查看部署日志，确认：
     - ✓ 构建成功
     - ✓ 数据库连接成功
     - ✓ 应用启动成功

3. **获取应用 URL**：
   - 在服务页面，点击 "Settings"
   - 在 "Domains" 部分，Railway 会提供默认域名
   - 格式：`your-app.up.railway.app`

4. **验证部署**：
   - 访问应用 URL
   - 访问 `/api/health` 端点，应该返回：`{"success":true,"message":"服务运行正常"}`

### 步骤 5：配置自定义域名（可选）

1. 在服务页面，点击 "Settings" > "Domains"
2. 点击 "Custom Domain"
3. 按照提示配置 DNS 记录

## 环境变量配置

### 自动注入的变量

Railway 会自动从 Postgres 服务注入：
- `DATABASE_URL` - PostgreSQL 连接字符串
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - PostgreSQL 连接参数

### 可选环境变量

如果需要，可以在服务的 Variables 页面添加：

- `NODE_ENV` = `production`
- `CORS_ORIGIN` = `*` 或具体域名（如果需要限制 CORS）
- `PORT` - 应用端口（Railway 会自动设置，通常不需要）

## 数据迁移（可选）

如果你有本地 SQLite 数据需要迁移：

1. **导出本地数据**（通过应用界面导出功能，如果有）
2. **在部署的应用中手动输入数据**（如果数据量不大）
3. **或使用数据库迁移脚本**（需要数据库连接工具）

## 故障排查

### 部署失败

1. 查看部署日志，找到错误信息
2. 常见问题：
   - 构建失败：检查 Dockerfile 和代码
   - 数据库连接失败：确认 Postgres 服务正在运行
   - 应用启动失败：查看 Deploy Logs 中的错误信息

### 数据库连接问题

1. 确认 Postgres 服务状态为 "Online"
2. 确认应用服务中没有手动设置 `DATABASE_URL`（Railway 会自动注入）
3. 查看应用日志，确认数据库连接信息

### 应用无法访问

1. 确认服务状态为 "Active"
2. 检查域名配置
3. 查看日志确认应用是否正常启动

## 其他部署平台

### Render

Render 是另一个流行的部署平台，支持免费套餐：

1. 注册 [Render](https://render.com)
2. 创建 Web Service，连接 GitHub 仓库
3. 需要外部数据库（如 Supabase），因为 Render 免费套餐不支持持久化磁盘
4. 配置 `DATABASE_URL` 环境变量

### 本地部署

1. 安装 Node.js 20+
2. 运行 `npm install`
3. 配置数据库（SQLite 或 PostgreSQL）
4. 运行 `npm run init-db` 初始化数据库
5. 运行 `npm start` 启动应用

## 相关文件

- `railway.json` - Railway 配置文件
- `Dockerfile` - Docker 构建文件
- `package.json` - 项目依赖和脚本
- `README.md` - 项目说明

## 下一步

部署成功后：

1. 访问应用 URL
2. 配置 AI API Key（在应用设置中）
3. 开始使用知识管理系统

