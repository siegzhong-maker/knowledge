# 部署检查清单

部署前的快速检查清单，确保一切配置正确。

## ✅ 部署前检查

### 1. 代码提交
- [ ] 所有更改已提交到Git
- [ ] 代码已推送到GitHub仓库

### 2. Railway项目配置

#### 基础服务
- [ ] Railway项目已创建
- [ ] Web服务已配置（自动检测或手动创建）
- [ ] PostgreSQL数据库服务已添加

#### 环境变量
在Railway服务页面的 **Variables** 标签中检查：

- [ ] `DATABASE_URL` - 应该自动从Postgres服务注入（格式：`${{Postgres.DATABASE_URL}}`）
- [ ] `NODE_ENV` = `production`（可选但推荐）
- [ ] `DB_TYPE` = `postgres`（可选，明确指定数据库类型）

#### Railway Volume（重要！）
**这是本次优化的关键配置，用于PDF文件持久化存储**

1. 在Railway服务页面，点击 **Settings**
2. 滚动到 **Volumes** 部分
3. [ ] 点击 **"+ New Volume"**
4. [ ] **Mount Path**: `/data/uploads`
5. [ ] **Name**: `uploads`（可选）
6. [ ] 点击 **Add** 保存

> **注意**：如果没有配置Volume，PDF文件在重新部署后会丢失！

### 3. 部署验证

部署后，检查以下日志信息：

#### 启动日志应包含：
```
✓ 上传目录已准备: /data/uploads
✓ 数据库连接成功
✓ PostgreSQL数据库初始化完成
✓ 服务器运行在 http://localhost:3000
```

#### 验证端点：
- [ ] 访问 `https://your-app.up.railway.app/api/health`
  - 应返回：`{"success":true,"message":"服务运行正常"}`

#### 功能测试：
- [ ] 可以访问应用首页
- [ ] 可以上传PDF文件
- [ ] PDF文件可以正常查看（包含图片）
- [ ] 数据加载速度正常（分页加载，不卡顿）

## 🚀 快速部署步骤

### 首次部署

1. **推送代码到GitHub**
   ```bash
   git add .
   git commit -m "性能优化：PDF持久化、分页加载、用户体验改进"
   git push origin main
   ```

2. **在Railway中配置Volume**
   - 打开Railway服务页面
   - Settings → Volumes → + New Volume
   - Mount Path: `/data/uploads`
   - 保存

3. **等待自动部署**
   - Railway会自动检测GitHub推送
   - 查看Deployments标签页监控部署进度

4. **验证部署**
   - 检查部署日志
   - 访问应用URL
   - 测试PDF上传和查看功能

### 重新部署（更新代码）

1. **推送新代码**
   ```bash
   git push origin main
   ```

2. **Railway自动部署**
   - 无需额外配置
   - Volume中的数据会保留

## ⚠️ 常见问题

### PDF文件丢失
- **原因**：未配置Railway Volume
- **解决**：按照上面的步骤配置Volume，路径为 `/data/uploads`

### 数据库连接失败
- **检查**：Postgres服务状态是否为"Online"
- **检查**：环境变量 `DATABASE_URL` 是否正确设置
- **查看**：部署日志中的数据库连接信息

### 部署失败
- **查看**：Deployments标签页的详细错误日志
- **检查**：代码是否有语法错误
- **检查**：package.json中的依赖是否正确

### PDF图片不显示
- **检查**：浏览器控制台是否有错误
- **检查**：PDF文件URL是否可访问（`/api/files/pdf/:id`）
- **查看**：网络请求是否返回200状态码

## 📝 环境变量参考

### 必需（自动注入）
- `DATABASE_URL` - PostgreSQL连接字符串

### 推荐
- `NODE_ENV` = `production`
- `DB_TYPE` = `postgres`

### 可选
- `UPLOADS_PATH` - 上传目录路径（默认：生产环境 `/data/uploads`，开发环境 `backend/uploads`）
- `CORS_ORIGIN` - CORS允许的源（默认：`*`）

## 📚 相关文档

- `RAILWAY_VOLUME_SETUP.md` - Railway Volume详细配置指南
- `DEPLOY.md` - 完整部署指南
- `RAILWAY_SETUP.md` - Railway数据库配置指南

