# Koyeb 部署指南（免费方案）

Koyeb 是一个完全免费的部署平台，无需信用卡，支持 Node.js 应用持续运行。

## 为什么选择 Koyeb？

- ✅ **完全免费**，无需信用卡
- ✅ 服务持续运行（无休眠机制）
- ✅ 自动 HTTPS 和全球 CDN
- ✅ 从 GitHub 自动部署
- ✅ 支持环境变量配置
- ✅ 连接 Supabase PostgreSQL 数据库

## 准备工作

1. 确保代码已推送到 GitHub 仓库：`siegzhong-maker/knowledge`
2. 已设置 Supabase 数据库（参考 `SUPABASE_SETUP.md`）
3. 准备好 DATABASE_URL 连接字符串

## 部署步骤

### 1. 注册 Koyeb 账号

1. 访问 [Koyeb 官网](https://www.koyeb.com)
2. 点击 "Get Started" 或 "Sign Up"
3. 选择 "Continue with GitHub"（推荐）
4. 授权 Koyeb 访问你的 GitHub 账号

### 2. 创建应用

1. 登录后，点击 "Create App" 或 "+ Create"
2. 选择 "GitHub" 作为代码源
3. 选择仓库：`siegzhong-maker/knowledge`
4. 选择分支：`main`（或你的主分支）

### 3. 配置应用

Koyeb 会自动检测 Node.js 项目，但需要确认以下配置：

**基础配置：**
- **Name**: `knowledge-manager`（或自定义名称）
- **Type**: Web Service
- **Runtime**: Node.js（自动检测）
- **Build Command**: `npm install`（自动检测）
- **Run Command**: `npm start`（自动检测）

**环境变量：**

点击 "Environment Variables" 或 "Advanced" 展开环境变量设置：

1. 点击 "Add Environment Variable"
2. 添加以下变量：
   - **Key**: `NODE_ENV`
   - **Value**: `production`
   - 点击 "Add"

3. 再次点击 "Add Environment Variable"
4. 添加数据库连接：
   - **Key**: `DATABASE_URL`
   - **Value**: `postgresql://postgres:Zhong%40123ch@db.eibgzxvspsdlkrwwiqjx.supabase.co:5432/postgres`
   - 点击 "Add"

5. （可选）如果需要限制 CORS：
   - **Key**: `CORS_ORIGIN`
   - **Value**: `*` 或具体域名
   - 点击 "Add"

### 4. 部署

1. 确认所有配置正确
2. 点击 "Deploy" 或 "Create App"
3. 等待部署完成（通常需要 2-5 分钟）

### 5. 查看部署状态

部署过程中可以：
- 查看构建日志
- 查看部署状态
- 等待部署完成

部署成功后，Koyeb 会提供一个 URL，如：
- `https://knowledge-manager-xxxxx.koyeb.app`

### 6. 初始化数据库

数据库会在首次启动时自动初始化（通过 `postinstall` 脚本）。

如果需要手动初始化：

1. 在应用详情页，点击 "Logs" 标签
2. 查找初始化日志，应该看到：
   - `✓ 已连接到PostgreSQL数据库`
   - `✓ PostgreSQL数据库初始化完成`

如果初始化失败，检查：
- DATABASE_URL 环境变量是否正确
- Supabase 数据库是否正常运行

## 访问应用

部署完成后：

- **Web前端**: `https://your-app-name.koyeb.app`
- **API端点**: `https://your-app-name.koyeb.app/api`
- **健康检查**: `https://your-app-name.koyeb.app/api/health`

## 后续配置

### 自定义域名（可选）

1. 在应用详情页，点击 "Domains" 标签
2. 点击 "Add Domain"
3. 输入你的域名
4. 按照提示配置 DNS 记录

### 自动部署

Koyeb 默认会：
- 监听 GitHub 仓库的 push 事件
- 自动触发重新部署
- 保持应用与代码同步

### 查看日志

1. 在应用详情页，点击 "Logs" 标签
2. 实时查看应用日志
3. 排查问题

### 监控和指标

在应用详情页可以查看：
- CPU 和内存使用情况
- 请求统计
- 错误日志

## 免费套餐限制

Koyeb 免费套餐提供：
- ✅ 2 个服务实例
- ✅ 512MB RAM 每个实例
- ✅ 共享 CPU 资源
- ✅ 自动 HTTPS
- ✅ 全球 CDN
- ✅ 无休眠机制

对于个人项目和小团队，这些资源通常足够使用。

## 故障排查

### 部署失败

1. **检查构建日志**
   - 查看 "Logs" 标签中的构建错误
   - 确认 `npm install` 成功
   - 确认 `npm start` 命令正确

2. **检查环境变量**
   - 确认 DATABASE_URL 正确配置
   - 检查密码中的特殊字符是否正确编码（`@` → `%40`）

### 数据库连接失败

1. **检查 DATABASE_URL**
   - 确认连接字符串格式正确
   - 验证密码是否正确编码
   - 检查 Supabase 项目状态

2. **检查网络连接**
   - 确认 Koyeb 可以访问外部网络
   - 检查 Supabase 防火墙设置

### 应用无法访问

1. **检查服务状态**
   - 在应用详情页查看服务状态
   - 确认服务处于 "Running" 状态

2. **查看日志**
   - 检查应用日志中的错误信息
   - 查看启动日志

## 与 Render 的对比

| 特性 | Koyeb | Render (免费) |
|------|-------|---------------|
| 免费 | ✅ 是 | ✅ 是 |
| 需要信用卡 | ❌ 否 | ❌ 否 |
| 休眠机制 | ❌ 无 | ✅ 有（15分钟） |
| Shell 访问 | ❌ 免费版不可用 | ⚠️ 需要付费 |
| 持续运行 | ✅ 是 | ⚠️ 会休眠 |
| 自动 HTTPS | ✅ 是 | ✅ 是 |
| 环境变量 | ✅ 支持 | ✅ 支持 |

## 下一步

1. ✅ 访问 https://www.koyeb.com 注册账号
2. ✅ 按照本指南部署应用
3. ✅ 配置 DATABASE_URL 环境变量
4. ✅ 等待部署完成
5. ✅ 访问应用并测试功能

更多信息请参考：
- [Koyeb 官方文档](https://www.koyeb.com/docs)
- [免费部署选项对比](./FREE_DEPLOYMENT_OPTIONS.md)

