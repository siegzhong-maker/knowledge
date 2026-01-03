# Railway 部署故障排查

## 常见错误及解决方案

### 错误 1: `ReferenceError: File is not defined`

**错误信息：**
```
ReferenceError: File is not defined
at Object.<anonymous> (/app/node_modules/undici/lib/web/webidl/index.js:531:48)
```

**原因：**
- Node.js 版本过低（需要 Node.js 20.0.0+）
- `File` API 是 Node.js 20 才引入的新特性

**解决方案：**

1. **使用 nixpacks.toml 文件（推荐 - 已创建）**
   - ✅ 项目根目录已有 `nixpacks.toml` 文件
   - 此文件会强制 Railway 使用 Node.js 20
   - 提交代码到 GitHub 后，Railway 会自动使用此配置

2. **在 Railway 环境变量中指定 Node.js 版本（辅助）**
   - 在服务页面的 "Variables" 标签
   - 添加环境变量：
     - **Key**: `NODE_VERSION`
     - **Value**: `20`
     - 保存并重新部署

3. **已添加的配置**
   - ✅ `package.json` 中已添加 `engines` 字段
   - ✅ 已创建 `.nvmrc` 文件
   - ✅ 已创建 `nixpacks.toml` 文件（最重要）

**Railway 配置步骤：**

1. 在 Railway 服务页面
2. 点击 "Variables" 标签（环境变量）
3. 点击 "New Variable"
4. 添加：
   - **Key**: `NODE_VERSION`
   - **Value**: `20`
5. 点击 "Add"
6. Railway 会自动触发重新部署

### 错误 2: 数据库连接失败

**错误信息：**
```
DATABASE_URL environment variable is required for PostgreSQL
```

**解决方案：**
1. 确认已在环境变量中配置 `DATABASE_URL`
2. 检查连接字符串格式是否正确
3. 确认密码中的特殊字符已正确编码（`@` → `%40`）

### 错误 3: 依赖安装失败

**解决方案：**
1. 检查 `package.json` 中的依赖版本
2. 查看构建日志中的具体错误
3. 确认 Node.js 版本兼容性

### 错误 4: 应用启动失败

**检查清单：**
- ✅ 环境变量配置正确（DATABASE_URL, NODE_ENV）
- ✅ Node.js 版本 >= 20
- ✅ 端口配置（Railway 自动设置 PORT 环境变量）
- ✅ 启动命令正确（`npm start`）

## 快速修复当前错误

对于当前的 `File is not defined` 错误，立即执行：

1. **在 Railway 环境变量中添加 NODE_VERSION**
   - 访问你的环境变量页面
   - 添加 `NODE_VERSION=20`
   - 保存
   - Railway 会自动重新部署

2. **或者删除服务重新创建**
   - 如果上述方法不行，可以删除当前服务
   - 重新创建服务
   - Railway 会自动读取 `.nvmrc` 或 `package.json` 中的 engines 配置

## 验证修复

部署成功后，检查日志应该看到：
- ✅ 构建成功
- ✅ 应用启动成功
- ✅ 数据库连接成功
- ✅ 没有 `File is not defined` 错误

## 联系支持

如果问题仍然存在：
1. 查看完整的构建日志和部署日志
2. 检查 Railway 服务状态
3. 查看 Railway 文档：https://docs.railway.app

