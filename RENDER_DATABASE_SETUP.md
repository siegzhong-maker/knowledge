# Render 数据库配置指南

## 你的 Supabase 信息

- **Supabase URL**: https://eibgzxvspsdlkrwwiqjx.supabase.co
- **项目引用**: eibgzxvspsdlkrwwiqjx

## DATABASE_URL 连接字符串

由于密码中包含特殊字符 `@`，需要进行 URL 编码（`@` → `%40`）：

```
postgresql://postgres:Zhong%40123ch@db.eibgzxvspsdlkrwwiqjx.supabase.co:5432/postgres
```

## 在 Render 中配置步骤

### 方式一：通过 Render 控制台（推荐）

1. **登录 Render 控制台**
   - 访问 https://dashboard.render.com
   - 登录你的账号

2. **找到你的服务**
   - 在 Dashboard 中找到 `knowledge-manager` 服务
   - 如果还没创建，先按照 `DEPLOY.md` 中的步骤创建服务

3. **添加环境变量**
   - 点击服务名称进入服务详情页
   - 点击左侧菜单的 **"Environment"** 标签
   - 点击 **"Add Environment Variable"** 按钮

4. **填写环境变量**
   - **Key**: `DATABASE_URL`
   - **Value**: 粘贴上面的连接字符串
     ```
     postgresql://postgres:Zhong%40123ch@db.eibgzxvspsdlkrwwiqjx.supabase.co:5432/postgres
     ```
   - 点击 **"Save Changes"**

5. **重新部署**
   - Render 会自动触发重新部署
   - 或者在 "Manual Deploy" 标签中点击 "Deploy latest commit"

### 方式二：通过 render.yaml（不推荐，密码会暴露）

如果需要通过 render.yaml 配置，可以添加：

```yaml
envVars:
  - key: DATABASE_URL
    value: postgresql://postgres:Zhong%40123ch@db.eibgzxvspsdlkrwwiqjx.supabase.co:5432/postgres
```

⚠️ **警告**：这种方式会将密码暴露在代码仓库中，不建议使用。

## 验证配置

部署完成后，检查日志确认数据库连接成功：

1. 在 Render 控制台的服务页面
2. 点击 **"Logs"** 标签
3. 查找以下日志信息：
   - `✓ 已连接到PostgreSQL数据库`
   - `✓ PostgreSQL数据库初始化完成`

如果看到错误，检查：
- DATABASE_URL 是否正确配置
- 密码中的特殊字符是否正确编码（`@` → `%40`）
- Supabase 项目是否正常运行

## 初始化数据库

数据库会在部署时自动初始化（通过 `postinstall` 脚本）。

如果需要手动初始化：

1. 在 Render 控制台的服务页面
2. 打开 **"Shell"** 标签
3. 运行：
   ```bash
   npm run init-db
   ```

## 安全提示

1. ✅ **不要**将 `DATABASE_URL.txt` 文件提交到 Git 仓库（已在 .gitignore 中排除）
2. ✅ **不要**在代码中硬编码数据库密码
3. ✅ **使用**环境变量存储敏感信息
4. ✅ **定期**更换数据库密码（在 Supabase 控制台设置中）

## 测试连接（本地）

如果想在本地测试连接：

```bash
# 设置环境变量
export DATABASE_URL="postgresql://postgres:Zhong%40123ch@db.eibgzxvspsdlkrwwiqjx.supabase.co:5432/postgres"

# 运行初始化脚本
npm run init-db

# 启动应用（会使用 PostgreSQL）
npm start
```

## 故障排查

### 连接失败

如果看到 "Database connection failed" 错误：

1. **检查密码编码**
   - 确认 `@` 已编码为 `%40`
   - 其他特殊字符也需要 URL 编码

2. **检查 Supabase 项目状态**
   - 访问 https://supabase.com/dashboard
   - 确认项目状态为 "Active"

3. **检查网络连接**
   - 确认 Render 服务可以访问外部网络
   - 检查防火墙设置

### 表创建失败

如果初始化时表创建失败：

1. 检查日志中的具体错误信息
2. 确认使用的是 `postgres` 用户（默认管理员）
3. 在 Supabase SQL Editor 中手动检查表是否已存在

## 下一步

配置完成后：

1. ✅ 数据库连接配置完成
2. 📝 按照 `DEPLOY.md` 完成 Render 部署
3. 🚀 访问应用并测试功能
4. 💾 数据将永久保存在 Supabase 中

