# 快速数据迁移指南

## 🎯 推荐方法：通过 API 迁移（解决连接超时问题）

如果直接连接数据库失败（ETIMEDOUT 错误），使用此方法。

### 步骤 1：获取 Railway 应用 URL

1. 登录 [Railway Dashboard](https://railway.app)
2. 进入你的项目 → 点击 **Knowledge** 服务
3. 点击 **"Settings"** 标签页
4. 在 **"Domains"** 部分，复制应用 URL（格式：`https://your-app.up.railway.app`）

### 步骤 2：运行 API 迁移脚本

```bash
API_URL="https://your-app.up.railway.app" npm run migrate-via-api
```

**替换说明**：
- 将 `https://your-app.up.railway.app` 替换为你的实际 Railway 应用 URL

### 步骤 3：验证迁移结果

迁移完成后会显示统计信息，然后访问应用验证数据。

---

## 📋 直接数据库迁移（如果连接正常）

### 步骤 1：确认本地数据库文件存在

```bash
# 检查数据库文件是否存在
ls -lh database/knowledge.db
```

如果文件存在，继续下一步。如果不存在，说明本地没有数据需要迁移。

---

### 步骤 2：获取 Railway 数据库连接字符串

**重要**：需要使用**外部可访问**的连接字符串（不是 `postgres.railway.internal`）

#### 方法 A：从 Railway Dashboard 获取（推荐）

1. 登录 [Railway Dashboard](https://railway.app)
2. 进入你的项目 → 点击 **Postgres** 服务
3. 点击 **"Variables"** 标签页
4. 查找 `DATABASE_URL` 或 `PGHOST`、`PGPORT` 等变量
5. 如果看到的是内部地址（`postgres.railway.internal`），需要构建外部地址

#### 方法 B：构建外部连接字符串

如果你有：
- 主机名：`postgres-production-2a13.up.railway.app`
- 密码：`ogCVevcGByawCsQuzKyzLBzUMEqZdnKa`

那么外部连接字符串是：
```
postgresql://postgres:ogCVevcGByawCsQuzKyzLBzUMEqZdnKa@postgres-production-2a13.up.railway.app:5432/railway
```

---

### 步骤 3：运行迁移命令

在项目根目录运行：

```bash
DATABASE_URL="postgresql://postgres:ogCVevcGByawCsQuzKyzLBzUMEqZdnKa@postgres-production-2a13.up.railway.app:5432/railway" npm run migrate-to-pg
```

**替换说明**：
- 将上面的连接字符串替换为你从 Railway 获取的实际连接字符串
- 确保使用外部地址（`postgres-production-2a13.up.railway.app`），不是内部地址

---

## ✅ 迁移成功标志

迁移完成后，你应该看到：

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

---

## 🔍 验证迁移结果

### 方法 1：访问应用验证

1. 打开你的 Railway 应用 URL
2. 检查数据是否正常显示：
   - 知识库列表
   - 知识项列表
   - 标签
   - 设置

### 方法 2：查看迁移统计

迁移脚本会自动显示每个表的记录数，确认数量是否正确。

---

## ⚠️ 常见问题

### Q1: 连接失败 `ECONNREFUSED`

**原因**：使用了内部地址或地址不正确

**解决**：
- 确保使用外部地址（`postgres-production-2a13.up.railway.app`）
- 检查密码是否正确
- 确认 Railway Postgres 服务状态为 "Online"

### Q2: 表不存在错误

**原因**：数据库表还没有创建

**解决**：
- 确保 Railway 应用已启动一次（会自动创建表）
- 或者等待应用部署完成后再迁移

### Q3: 迁移脚本卡住

**原因**：数据量大或网络问题

**解决**：
- 等待一段时间（大数据量可能需要几分钟）
- 检查网络连接
- 查看终端是否有错误信息

---

## 📝 完整命令示例

```bash
# 1. 进入项目目录
cd /Users/silas/Desktop/knowledge

# 2. 确认数据库文件存在
ls database/knowledge.db

# 3. 运行迁移（替换为你的实际连接字符串）
DATABASE_URL="postgresql://postgres:你的密码@postgres-production-2a13.up.railway.app:5432/railway" npm run migrate-to-pg
```

---

## 🎯 迁移后检查清单

- [ ] 迁移脚本显示 "✓ 数据迁移完成！"
- [ ] 迁移统计显示所有表的记录数
- [ ] 访问应用，数据正常显示
- [ ] 知识库列表正常
- [ ] 知识项列表正常
- [ ] 标签正常显示
- [ ] 设置正常加载

---

## 💡 提示

- ✅ 迁移脚本支持重复运行（不会重复插入数据）
- ✅ 如果迁移失败，可以重新运行
- ⚠️ PDF 文件需要单独上传（不会自动迁移）
- 💾 建议迁移前备份本地数据库文件

