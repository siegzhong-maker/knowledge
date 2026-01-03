# Supabase 设置指南

本指南将帮助你设置 Supabase PostgreSQL 数据库，用于知识管理系统的数据持久化存储。

## 为什么选择 Supabase？

- ✅ **完全免费**：免费套餐提供 500MB 数据库存储
- ✅ **无需信用卡**：注册即可使用
- ✅ **PostgreSQL**：基于强大的 PostgreSQL 数据库
- ✅ **自动备份**：免费套餐包含每日备份
- ✅ **全球CDN**：快速访问

## 步骤 1：注册 Supabase 账号

1. 访问 [Supabase 官网](https://supabase.com)
2. 点击 "Start your project" 或 "Sign up"
3. 使用 GitHub 账号登录（推荐）或邮箱注册

## 步骤 2：创建新项目

1. 登录后，点击 "New Project"
2. 填写项目信息：
   - **Name**: knowledge-manager（或自定义名称）
   - **Database Password**: 设置一个强密码（**务必保存！**）
   - **Region**: 选择离你最近的区域（如 Southeast Asia (Singapore)）
   - **Pricing Plan**: Free（免费套餐）
3. 点击 "Create new project"
4. 等待项目创建完成（约 1-2 分钟）

## 步骤 3：获取数据库连接字符串

1. 在项目控制台，点击左侧菜单的 **"Settings"**（设置）
2. 点击 **"Database"** 子菜单
3. 滚动到 **"Connection string"** 部分
4. 选择 **"URI"** 标签
5. 复制连接字符串，格式类似：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. 将 `[YOUR-PASSWORD]` 替换为你创建项目时设置的密码

## 步骤 4：配置 Render 环境变量

### 方式一：在 Render 控制台配置

1. 在 Render 控制台，进入你的服务设置
2. 点击 **"Environment"** 标签
3. 点击 **"Add Environment Variable"**
4. 添加以下变量：
   - **Key**: `DATABASE_URL`
   - **Value**: 粘贴步骤 3 中获取的连接字符串（已替换密码）
5. 点击 **"Save Changes"**

### 方式二：在 render.yaml 中配置（不推荐，密码会暴露）

如果使用 render.yaml，可以在环境变量中引用：
```yaml
envVars:
  - key: DATABASE_URL
    sync: false  # 不会同步，需要在控制台手动配置
    value: postgresql://...  # 这里填写完整的连接字符串
```

**注意**：建议使用方式一，避免在代码仓库中暴露密码。

## 步骤 5：初始化数据库

部署到 Render 后，数据库会自动初始化（通过 `postinstall` 脚本）。

如果需要手动初始化：

1. 在 Render 控制台的服务页面
2. 打开 **"Shell"** 标签
3. 运行：
   ```bash
   npm run init-db
   ```

或者设置 `DATABASE_URL` 环境变量后在本地运行：
```bash
export DATABASE_URL="postgresql://..."
npm run init-db
```

## 步骤 6：验证连接

1. 访问你的应用 URL
2. 尝试创建一个知识项
3. 如果成功，说明数据库连接正常

## 免费套餐限制

Supabase 免费套餐提供：
- **数据库存储**: 500MB
- **带宽**: 2GB/月
- **API 请求**: 50,000/月
- **存储空间**: 1GB（如果需要文件存储）

对于个人或小团队使用，这些限制通常足够。

## 安全建议

1. **保护密码**：不要在代码仓库中提交数据库密码
2. **使用环境变量**：始终通过环境变量配置敏感信息
3. **定期备份**：虽然 Supabase 提供自动备份，但建议定期导出重要数据
4. **监控使用量**：在 Supabase 控制台监控数据库使用情况

## 故障排查

### 连接失败

- 检查 `DATABASE_URL` 环境变量是否正确设置
- 确认密码是否正确（注意特殊字符需要 URL 编码）
- 检查 Supabase 项目是否正常运行

### 表不存在

- 运行 `npm run init-db` 初始化数据库
- 检查初始化脚本是否有错误

### 权限错误

- 确保使用的是 `postgres` 用户（默认管理员用户）
- 检查项目设置中的数据库访问权限

## 升级到付费套餐

如果需要更多资源：
- **Pro 计划**: $25/月
  - 8GB 数据库存储
  - 50GB 带宽
  - 无限 API 请求

更多信息请访问 [Supabase 定价页面](https://supabase.com/pricing)

## 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [部署指南](./DEPLOY.md)

