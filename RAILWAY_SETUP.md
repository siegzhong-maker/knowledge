# Railway 数据库配置指南

## 问题诊断

当前应用显示 `SQLITE_ERROR: no such table` 错误，说明应用正在尝试使用 SQLite 数据库，而不是 PostgreSQL。这是因为 `DATABASE_URL` 环境变量还没有正确配置。

## 解决方案：使用 Supabase 数据库

如果你使用的是 **Supabase** 作为数据库（而不是 Railway 的 Postgres 服务），需要按以下步骤配置：

### 步骤 1：在 Supabase 获取数据库连接字符串

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目：`siegzhong-maker's Project`
3. 在左侧菜单，点击 **"Settings"**（设置）
4. 在 **"PROJECT SETTINGS"** 下，点击 **"Database"**（不是 "Data API"）
5. 在 **"Connection string"** 部分，找到 **"URI"** 标签
6. 复制连接字符串，格式类似：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.eibgzxvspsdlkrwwiqjx.supabase.co:5432/postgres
   ```
   ⚠️ **注意**：需要将 `[YOUR-PASSWORD]` 替换为你的实际数据库密码

### 步骤 2：在 Railway 中配置 DATABASE_URL

1. 回到 Railway 的 Knowledge 服务页面
2. 点击 **"Variables"** 标签页
3. 在 **"Suggested Variables"** 部分，找到 `DATABASE_URL`
4. 点击 `DATABASE_URL` 的值字段，将值改为你从 Supabase 复制的连接字符串
   - 或者点击 **"+ New Variable"** 手动添加
5. 点击 **"Add"** 按钮保存

### 步骤 3：添加其他推荐变量

同时添加以下变量：

- `DB_TYPE` = `postgres` （明确指定使用 PostgreSQL）
- `CORS_ORIGIN` = `*` 或你的域名（如果需要限制 CORS）
- `NODE_ENV` = `production`

---

## 替代方案：使用 Railway Postgres 服务

如果你使用的是 **Railway 的 Postgres 服务**（而不是 Supabase），按以下步骤：

### 1. 在 Railway 中配置环境变量

在 Railway 的 Knowledge 服务页面：

1. 点击 **"Variables"** 标签页
2. 在 **"Suggested Variables"** 部分，找到 `DATABASE_URL`
3. 确保 `DATABASE_URL` 的值设置为：`${{Postgres.DATABASE_URL}}`
   - 这会自动引用 Postgres 服务的数据库连接字符串
4. 点击 **"Add"** 按钮添加这个变量

### 2. 添加其他推荐变量（可选但建议）

同时添加以下变量：

- `DB_TYPE` = `postgres` （明确指定使用 PostgreSQL）
- `CORS_ORIGIN` = `*` 或你的域名（如果需要限制 CORS）
- `NODE_ENV` = `production`

### 3. 重新部署应用

配置完环境变量后：

1. Railway 会自动触发重新部署
2. 或者手动点击 **"Deploy"** 按钮
3. 等待部署完成

### 4. 验证数据库连接

部署完成后：

1. 查看 **"Deployments"** 标签页的日志
2. 应该看到：`✓ 已连接到PostgreSQL数据库`
3. 应该看到：`✓ PostgreSQL数据库初始化完成`

### 5. 如果表仍未创建

如果部署后表仍然不存在，可以手动运行初始化：

1. 在 Railway 服务页面，点击 **"Settings"**
2. 找到 **"Command"** 或使用 **"Deployments"** 标签页
3. 运行命令：`npm run init-db`

或者通过 Railway CLI：

```bash
railway run npm run init-db
```

## 验证步骤

1. 访问应用 URL
2. 打开浏览器开发者工具（F12）
3. 查看 Console，不应该再看到 `SQLITE_ERROR` 错误
4. 应该能看到数据正常加载

## 常见问题

### Q: 为什么还是显示 SQLite 错误？

A: 检查以下几点：
- 确认 `DATABASE_URL` 变量已添加且值为 `${{Postgres.DATABASE_URL}}`
- 确认 Postgres 服务状态为 "Online"
- 重新部署应用（环境变量更改后需要重新部署）

### Q: 如何确认环境变量已生效？

A: 在部署日志中查看，应该看到：
```
[Database] 连接信息: postgres://...
✓ 已连接到PostgreSQL数据库
```

而不是：
```
✓ 已连接到SQLite数据库
```

## 快速配置命令

如果你想通过 Railway CLI 配置（如果已安装）：

```bash
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
railway variables set DB_TYPE=postgres
railway variables set NODE_ENV=production
```

