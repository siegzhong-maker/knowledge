# Railway Node.js 版本问题修复指南

## 问题

即使添加了 `NODE_VERSION` 环境变量，Railway 仍然使用 Node.js 18，导致 `File is not defined` 错误。

## 解决方案

### 方法 1: 使用 nixpacks.toml（推荐）✅

已创建 `nixpacks.toml` 文件，这会强制 Railway 使用 Node.js 20。

**步骤：**

1. **提交代码到 GitHub**
   ```bash
   git add nixpacks.toml package.json .nvmrc
   git commit -m "Fix: Specify Node.js 20 for Railway deployment"
   git push origin main
   ```

2. **Railway 会自动重新部署**
   - Railway 会检测到新的提交
   - 使用 `nixpacks.toml` 配置构建
   - 使用 Node.js 20

3. **验证版本**
   - 查看部署日志
   - 应该看到 Node.js 20.x 而不是 18.x

### 方法 2: 删除并重新创建服务

如果方法 1 不行，可以删除服务重新创建：

1. 在 Railway 项目页面
2. 找到你的服务
3. 点击服务设置
4. 删除服务
5. 重新创建服务
6. 连接 GitHub 仓库
7. Railway 会使用新的配置

### 方法 3: 使用 Railway CLI 强制重建

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 链接到项目
railway link

# 强制重建
railway up --detach
```

## 验证修复

部署成功后，在日志中应该看到：

✅ **正确的日志：**
```
Node.js v20.x.x
```

❌ **错误的日志（之前）：**
```
Node.js v18.20.5
ReferenceError: File is not defined
```

## 为什么需要 nixpacks.toml？

Railway 使用 Nixpacks 构建系统。虽然环境变量 `NODE_VERSION` 应该有效，但有时 Railway 会忽略它，特别是如果：
- 服务是之前创建的（使用旧配置）
- Nixpacks 缓存了旧配置

`nixpacks.toml` 文件会：
- ✅ 明确告诉 Nixpacks 使用 Node.js 20
- ✅ 覆盖任何默认设置
- ✅ 确保每次部署都使用正确的版本

## 当前配置状态

已创建以下文件来确保 Node.js 20：

1. ✅ `nixpacks.toml` - Nixpacks 构建配置（最重要）
2. ✅ `package.json` - engines 字段
3. ✅ `.nvmrc` - Node 版本文件
4. ✅ 环境变量 `NODE_VERSION=20`（如果已添加）

## 下一步

1. **提交并推送代码**
   ```bash
   git add .
   git commit -m "Fix: Add nixpacks.toml to force Node.js 20"
   git push origin main
   ```

2. **等待 Railway 重新部署**
   - Railway 会自动检测 GitHub 推送
   - 使用新的 nixpacks.toml 配置
   - 应该使用 Node.js 20

3. **检查日志**
   - 确认使用 Node.js 20.x
   - 确认没有 `File is not defined` 错误
   - 确认应用启动成功

## 如果还是不行

如果所有方法都试过了还是不行：

1. **检查 Railway 项目设置**
   - 确认使用的是 Nixpacks 构建器（不是 Dockerfile）
   - 在服务 Settings → Build 中查看

2. **查看完整构建日志**
   - 在 Deploy Logs 中查看
   - 查找 Node.js 版本信息
   - 查找任何错误信息

3. **联系 Railway 支持**
   - 提供部署日志
   - 说明问题
   - Railway 支持通常响应很快

