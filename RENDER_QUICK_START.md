# Render 快速部署指南

## 前置条件

✅ 代码已推送到 GitHub: https://github.com/siegzhong-maker/knowledge.git

## 部署步骤

### 1. 在 Render 注册并登录

访问 [Render](https://render.com)，使用 GitHub 账号登录（推荐）。

### 2. 创建新服务

#### 方式一：使用 render.yaml（推荐）

1. 在 Render 控制台点击 **"New +"** > **"Blueprint"**
2. 连接到 GitHub 仓库：
   - 选择 **"Connect GitHub"**（如果还没连接）
   - 授权 Render 访问你的 GitHub 账号
   - 选择仓库：`siegzhong-maker/knowledge`
3. Render 会自动检测到 `render.yaml` 配置文件
4. 点击 **"Apply"** 创建服务

#### 方式二：手动创建 Web Service

1. 在 Render 控制台点击 **"New +"** > **"Web Service"**
2. 连接到 GitHub 仓库：
   - 选择 **"Connect GitHub"**（如果还没连接）
   - 选择仓库：`siegzhong-maker/knowledge`
3. 配置服务：
   - **Name**: `knowledge-manager`（或自定义）
   - **Region**: `oregon`（选择离你最近的区域）
   - **Branch**: `main`
   - **Root Directory**: 留空
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. 添加环境变量：
   - `NODE_ENV`: `production`
   - `DATABASE_PATH`: `/opt/render/project/src/database/knowledge.db`
   - `CORS_ORIGIN`: `*`（或设置具体域名）
5. **添加持久化磁盘（重要）**：
   - 在服务设置中找到 **"Disks"** 部分
   - 点击 **"Add Disk"**
   - **Name**: `knowledge-db`
   - **Mount Path**: `/opt/render/project/src/database`
   - **Size**: `1 GB`
6. 点击 **"Create Web Service"**

### 3. 等待部署完成

- 首次部署需要 5-10 分钟
- 可以在 **"Events"** 标签页查看部署日志
- 部署成功后，Render 会提供一个 URL，如：`https://knowledge-manager.onrender.com`

### 4. 初始化数据库（如果需要）

数据库会在首次启动时自动创建。如果需要手动初始化：

1. 在服务页面点击 **"Shell"** 标签
2. 运行：`npm run init-db`

### 5. 访问应用

- **Web前端**: `https://your-app-name.onrender.com`
- **API端点**: `https://your-app-name.onrender.com/api`
- **健康检查**: `https://your-app-name.onrender.com/api/health`

## 配置 DeepSeek API Key

部署完成后，在应用内配置：

1. 访问你的应用 URL
2. 在侧边栏底部点击用户头像或设置图标
3. 输入 DeepSeek API Key（在 https://platform.deepseek.com 获取）
4. 点击"测试连接"验证
5. 保存设置

## 重要提示

### Render 免费套餐限制

- ⏰ **休眠机制**: 应用在 15 分钟无活动后会自动休眠
- 🚀 **唤醒时间**: 首次访问休眠的应用需要等待 30-60 秒
- 💾 **数据库持久化**: 数据库文件会保存在持久化磁盘中
- 📁 **文件上传限制**: `backend/uploads/` 目录不在持久化磁盘内，上传的PDF文件在应用重启后会丢失

### 避免休眠

使用以下服务定期访问你的应用，保持活跃：

- [UptimeRobot](https://uptimerobot.com) - 免费监控服务
- [cron-job.org](https://cron-job.org) - 免费定时任务
- 设置每分钟访问一次健康检查端点：`GET /api/health`

## 故障排查

### 部署失败

1. 检查构建日志中的错误信息
2. 确认 `npm install` 成功
3. 确认 `npm start` 命令正确

### 应用无法访问

1. 检查服务状态是否为 "Live"
2. 查看日志中的错误信息
3. 检查健康检查端点是否正常

### 数据库问题

1. 确认持久化磁盘已正确挂载
2. 检查 `DATABASE_PATH` 环境变量是否正确
3. 在 Shell 中手动运行 `npm run init-db`

## 下一步

部署完成后，你可以：

1. 配置自定义域名（需要付费套餐）
2. 设置环境变量保护敏感信息
3. 配置自动部署（GitHub push 时自动部署）
4. 查看应用日志和监控数据

更多详细信息请参考 [DEPLOY.md](./DEPLOY.md)。

