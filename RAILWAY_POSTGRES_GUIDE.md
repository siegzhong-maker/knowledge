
# Railway Postgres 数据库使用指南

## 关于费用

### Railway 免费额度
- Railway 提供 **$5/月** 的免费额度（新用户）
- Postgres 服务会消耗这个免费额度
- 小型项目通常可以免费使用
- 超出免费额度后按实际使用量付费

### Postgres 服务费用
- Postgres 服务本身是免费的（开源软件）
- 但 Railway 的托管服务会消耗计算资源
- 对于小型应用，通常不会超出 $5 的免费额度

## 如何使用 Railway Postgres

### 方法 1：使用 Railway 的 Postgres 服务（推荐）

#### 步骤 1：添加 Postgres 服务

1. 在 Railway 项目页面，点击 **"+ New"** 按钮
2. 选择 **"Database"** > **"Add PostgreSQL"**
3. Railway 会自动创建并配置 Postgres 服务
4. 等待服务启动（状态显示为 "Online"）

#### 步骤 2：配置应用连接

Railway 会自动处理连接配置：

1. 在 **Knowledge** 服务页面，点击 **"Variables"** 标签页
2. 在 **"Suggested Variables"** 部分，找到 `DATABASE_URL`
3. 确保值为：`${{Postgres.DATABASE_URL}}`
   - 这会自动引用 Postgres 服务的连接字符串
4. 点击 **"Add"** 按钮添加变量

#### 步骤 3：验证连接

1. Railway 会自动重新部署应用
2. 查看 **"Deployments"** 标签页的日志
3. 应该看到：`✓ 已连接到PostgreSQL数据库`
4. 应该看到：`✓ PostgreSQL数据库初始化完成`

### 方法 2：使用外部 Postgres（如 Supabase）

如果你已经有 Supabase 或其他 Postgres 数据库：

1. 在 Railway 的 **Variables** 页面
2. 添加 `DATABASE_URL` 变量
3. 值为你的数据库连接字符串（从 Supabase 等获取）

## Railway Postgres vs Supabase 对比

| 特性 | Railway Postgres | Supabase |
|------|----------------|----------|
| **免费额度** | $5/月 | 500MB 数据库，2GB 带宽 |
| **设置难度** | ⭐ 非常简单（自动配置） | ⭐⭐ 需要手动获取连接字符串 |
| **集成度** | ⭐⭐⭐ 与 Railway 完美集成 | ⭐⭐ 需要手动配置 |
| **管理界面** | Railway Dashboard | Supabase Dashboard |
| **推荐场景** | Railway 部署的应用 | 需要 Supabase 其他功能（Auth、Storage等） |

## 推荐方案

### 如果你已经在 Railway 部署应用
**推荐使用 Railway Postgres**：
- ✅ 自动配置，无需手动设置
- ✅ 与 Railway 完美集成
- ✅ 免费额度足够小型项目使用

### 如果你已经有 Supabase 账号
**可以使用 Supabase**：
- ✅ 免费额度更明确（500MB）
- ✅ 提供更多功能（Auth、Storage等）
- ⚠️ 需要手动配置连接字符串

## 当前状态检查

根据你的截图，你已经有了：
- ✅ Railway Postgres 服务（状态：Online）
- ✅ Knowledge 应用服务

**下一步**：
1. 在 Knowledge 服务的 Variables 页面
2. 添加 `DATABASE_URL = ${{Postgres.DATABASE_URL}}`
3. 添加 `DB_TYPE = postgres`（可选，但推荐）
4. 重新部署应用

## 费用监控

### 查看使用情况
1. 在 Railway 项目页面，右上角显示剩余额度
2. 例如：`12 days or $3.26 left`
3. 点击可以查看详细使用情况

### 节省费用的建议
- 使用 Railway Postgres（通常比外部服务更便宜）
- 定期清理不需要的数据
- 监控数据库大小和查询频率

## 常见问题

### Q: Railway Postgres 是免费的吗？
A: 在 $5/月 免费额度内是免费的。小型项目通常不会超出。

### Q: 如何知道是否超出免费额度？
A: Railway 会在仪表板显示使用情况和剩余额度。

### Q: 可以同时使用 Railway Postgres 和 Supabase 吗？
A: 可以，但不推荐。选择一个即可，避免重复费用。

### Q: 如何切换到 Railway Postgres？
A: 如果当前使用 Supabase，只需：
1. 在 Railway 添加 Postgres 服务
2. 将 `DATABASE_URL` 改为 `${{Postgres.DATABASE_URL}}`
3. 重新部署

## 下一步操作

根据你的情况，建议：

1. **如果你还没有配置 DATABASE_URL**：
   - 在 Railway Knowledge 服务的 Variables 页面
   - 添加 `DATABASE_URL = ${{Postgres.DATABASE_URL}}`
   - 添加 `DB_TYPE = postgres`

2. **如果已经配置了 Supabase**：
   - 可以继续使用 Supabase（如果免费额度够用）
   - 或者切换到 Railway Postgres（更简单，集成更好）

3. **验证配置**：
   - 查看部署日志，确认数据库连接成功
   - 访问应用，确认不再有 SQLite 错误

