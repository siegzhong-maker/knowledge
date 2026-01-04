# 本地数据迁移到云端指南

本指南帮助你将本地 SQLite 数据库迁移到 Railway PostgreSQL 数据库。

## 前置条件

1. ✅ Railway 应用已部署并正常运行
2. ✅ 数据库表已初始化（应用启动时会自动创建）
3. ✅ 本地有 SQLite 数据库文件：`database/knowledge.db`

## 方法 1：使用迁移脚本（推荐）

### 步骤 1：获取 Railway 数据库连接字符串

1. 登录 [Railway Dashboard](https://railway.app)
2. 进入你的项目
3. 点击 **Postgres** 服务
4. 点击 **"Variables"** 标签页
5. 找到 `DATABASE_URL` 变量
6. 点击右侧的眼睛图标显示完整连接字符串
7. 复制连接字符串（格式类似：`postgresql://postgres:password@host:5432/railway`）

### 步骤 2：在本地运行迁移脚本

1. 确保本地环境已安装依赖：
   ```bash
   npm install
   ```

2. 设置环境变量并运行迁移：
   ```bash
   # 设置 Railway 数据库连接字符串
   export DATABASE_URL="postgresql://postgres:password@host:5432/railway"
   
   # 运行迁移脚本
   npm run migrate-to-pg
   ```

   或者一行命令：
   ```bash
   DATABASE_URL="postgresql://postgres:password@host:5432/railway" npm run migrate-to-pg
   ```

### 步骤 3：验证迁移结果

迁移脚本会自动显示迁移统计：
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

### 步骤 4：验证云端数据

1. 访问你的 Railway 应用 URL
2. 检查数据是否正常显示
3. 测试各项功能是否正常

## 方法 2：使用 Railway CLI（如果已安装）

如果你安装了 Railway CLI，可以直接在 Railway 环境中运行迁移：

```bash
# 登录 Railway
railway login

# 进入项目目录
railway link

# 运行迁移脚本（会自动使用 Railway 的 DATABASE_URL）
railway run npm run migrate-to-pg
```

## 方法 3：手动迁移（数据量很小的情况）

如果数据量很小（< 10 条记录），可以手动在应用界面中重新输入。

## 迁移脚本说明

迁移脚本 `backend/scripts/migrate-sqlite-to-pg.js` 会：

1. ✅ 连接本地 SQLite 数据库
2. ✅ 连接 Railway PostgreSQL 数据库
3. ✅ 迁移以下表的数据：
   - `knowledge_bases` - 知识库
   - `modules` - 模块
   - `source_items` - 知识项（文本、链接、PDF等）
   - `tags` - 标签
   - `settings` - 设置
   - `user_contexts` - 用户上下文
4. ✅ 自动处理重复数据（使用 ON CONFLICT）
5. ✅ 显示迁移统计

## 注意事项

### 数据安全

- ⚠️ **迁移前建议备份**：
  - 本地 SQLite 数据库：复制 `database/knowledge.db` 文件
  - Railway 数据库：可以通过 Railway Dashboard 导出

### 重复迁移

- ✅ 迁移脚本支持重复运行
- ✅ 使用 `ON CONFLICT` 处理重复数据
- ✅ 不会删除已有数据

### 文件上传

- ⚠️ **PDF 文件不会自动迁移**
- ⚠️ 如果本地有上传的 PDF 文件，需要：
  1. 手动上传到 Railway 应用
  2. 或使用 Railway 的持久化存储卷

### 迁移顺序

迁移脚本按以下顺序迁移数据：
1. `knowledge_bases` - 先迁移知识库
2. `modules` - 再迁移模块
3. `source_items` - 然后迁移知识项
4. `tags` - 迁移标签
5. `settings` - 迁移设置
6. `user_contexts` - 最后迁移用户上下文

## 故障排查

### 问题 1：连接失败

**错误**：`Error: connect ECONNREFUSED`

**解决**：
- 检查 `DATABASE_URL` 是否正确
- 确认 Railway Postgres 服务状态为 "Online"
- 检查网络连接

### 问题 2：表不存在

**错误**：`relation "source_items" does not exist`

**解决**：
- 确保应用已启动一次（会自动创建表）
- 或手动运行：`npm run init-db`

### 问题 3：数据类型错误

**错误**：`invalid input syntax for type boolean`

**解决**：
- 迁移脚本已自动处理布尔值转换
- 如果仍有问题，检查 SQLite 数据格式

### 问题 4：重复键错误

**错误**：`duplicate key value violates unique constraint`

**解决**：
- 迁移脚本已使用 `ON CONFLICT` 处理
- 重复数据会被跳过，不会报错

## 迁移后验证清单

- [ ] 知识库列表正常显示
- [ ] 知识项列表正常显示
- [ ] 标签正常显示
- [ ] 设置正常加载
- [ ] 用户上下文正常加载
- [ ] 搜索功能正常
- [ ] AI 功能正常

## 下一步

迁移完成后：

1. ✅ 验证所有数据已正确迁移
2. ✅ 测试应用各项功能
3. ✅ 可以删除本地 SQLite 数据库（可选，建议先备份）
4. ✅ 开始使用云端应用

## 相关文件

- `backend/scripts/migrate-sqlite-to-pg.js` - 迁移脚本
- `backend/services/db-pg.js` - PostgreSQL 数据库服务
- `database/knowledge.db` - 本地 SQLite 数据库

