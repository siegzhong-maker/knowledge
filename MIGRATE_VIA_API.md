# 通过 API 迁移数据指南

## 为什么使用 API 迁移？

如果直接连接 Railway Postgres 数据库失败（出现 `ETIMEDOUT` 错误），这是因为 Railway 的 Postgres 服务默认不允许外部直接连接。

通过 API 迁移可以：
- ✅ 绕过直接数据库连接限制
- ✅ 更安全（通过应用服务器）
- ✅ 更简单（不需要配置数据库连接）

## 迁移步骤

### 步骤 1：确认 Railway 应用已部署

确保你的 Railway 应用已经部署并正常运行：
1. 访问你的 Railway 应用 URL
2. 确认应用可以正常访问
3. 确认数据库表已创建（应用启动时会自动创建）

### 步骤 2：获取应用 URL

1. 登录 [Railway Dashboard](https://railway.app)
2. 进入你的项目
3. 点击 **Knowledge** 服务
4. 点击 **"Settings"** 标签页
5. 在 **"Domains"** 部分，找到应用 URL
   - 格式：`https://your-app.up.railway.app`
   - 或：`https://knowledge-production-xxxx.up.railway.app`

### 步骤 3：确认本地数据库文件

```bash
ls database/knowledge.db
```

如果文件存在，继续下一步。

### 步骤 4：运行迁移脚本

在项目根目录运行：

```bash
API_URL="https://your-app.up.railway.app" npm run migrate-via-api
```

**完整示例**：
```bash
cd /Users/silas/Desktop/knowledge
API_URL="https://knowledge-production-xxxx.up.railway.app" npm run migrate-via-api
```

### 步骤 5：等待迁移完成

迁移脚本会：
1. 连接本地 SQLite 数据库
2. 读取所有表的数据
3. 通过 HTTP API 上传到 Railway
4. 显示迁移统计

完成后会显示：
```
✓ 数据迁移完成！

迁移统计：
- knowledge_bases: X 条记录
- modules: X 条记录
- source_items: X 条记录
- tags: X 条记录
- settings: X 条记录
- user_contexts: X 条记录
```

## 验证迁移结果

1. 访问你的 Railway 应用 URL
2. 检查数据是否正常显示：
   - 知识库列表
   - 知识项列表
   - 标签
   - 设置

## 常见问题

### Q1: 连接失败 `ECONNREFUSED` 或 `ENOTFOUND`

**原因**：API_URL 不正确或应用未运行

**解决**：
- 检查 API_URL 是否正确
- 确认 Railway 应用状态为 "Online"
- 确认应用 URL 可以正常访问

### Q2: 404 错误

**原因**：迁移 API 端点不存在

**解决**：
- 确保代码已部署到 Railway（包含新的迁移路由）
- 检查部署日志确认路由已添加

### Q3: 迁移部分数据失败

**原因**：数据格式问题或重复数据

**解决**：
- 迁移脚本会自动跳过重复数据
- 检查终端输出的错误信息
- 可以重新运行迁移（不会重复插入）

## 技术说明

### 迁移流程

```
本地 SQLite → 读取数据 → JSON 格式 → HTTP POST → Railway API → PostgreSQL
```

### API 端点

- **URL**: `POST /api/migrate/upload`
- **Content-Type**: `application/json`
- **Body**: 
  ```json
  {
    "knowledge_bases": [...],
    "modules": [...],
    "source_items": [...],
    "tags": [...],
    "settings": [...],
    "user_contexts": [...]
  }
  ```

### 数据安全

- ✅ 使用 `ON CONFLICT` 处理重复数据
- ✅ 不会删除已有数据
- ✅ 支持重复运行
- ✅ 数据通过 HTTPS 传输（如果使用 HTTPS URL）

## 下一步

迁移完成后：
1. ✅ 验证所有数据已正确迁移
2. ✅ 测试应用各项功能
3. ✅ 可以删除本地 SQLite 数据库（可选，建议先备份）
4. ✅ 开始使用云端应用

