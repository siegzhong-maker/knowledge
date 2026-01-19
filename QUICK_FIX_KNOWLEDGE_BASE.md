# 快速修复：创建默认知识库

## 问题

应用显示 "未找到知识库"，需要创建默认知识库。

## 解决方案

### 方法一：使用 SQL 脚本（推荐）

1. **打开 Supabase Dashboard**
   - 访问：https://app.supabase.com
   - 进入您的项目

2. **打开 SQL Editor**
   - 左侧菜单点击 **"SQL Editor"**
   - 点击 **"New query"**

3. **执行 SQL 脚本**
   - 打开项目文件：`INIT_DEFAULT_KNOWLEDGE_BASE.sql`
   - 复制整个 SQL 内容
   - 粘贴到 Supabase SQL Editor
   - 点击 **"Run"** 执行

4. **验证**
   - 执行后应该看到 "默认知识库已创建"
   - 在 Table Editor 中打开 `knowledge_bases` 表
   - 应该能看到一条 `is_default = true` 的记录

### 方法二：手动创建（如果 SQL 脚本失败）

1. **打开 Table Editor**
   - 左侧菜单点击 **"Table Editor"**
   - 选择 `knowledge_bases` 表

2. **插入新行**
   - 点击 **"Insert"** > **"Insert row"**
   - 填写以下字段：
     - `id`: `kb-default`
     - `name`: `默认知识库`
     - `description`: `系统默认知识库，用于存储所有文档和知识点`（可选）
     - `icon`: `book`（可选）
     - `color`: `#6366f1`（可选）
     - `is_default`: `true` ⭐（重要！）
     - `created_at`: 当前时间戳（毫秒），例如：`1705392000000`
     - `updated_at`: 当前时间戳（毫秒），例如：`1705392000000`

3. **保存**
   - 点击 **"Save"** 或按 `Cmd+Enter`

## 获取当前时间戳

如果需要当前时间戳，可以在浏览器控制台运行：
```javascript
Date.now()
```

或者在 SQL Editor 中执行：
```sql
SELECT EXTRACT(EPOCH FROM NOW()) * 1000;
```

## 验证

创建完成后：
1. 刷新应用页面
2. "未找到知识库" 的警告应该消失
3. 应该能看到默认知识库

## 如果还是不行

1. 检查 `knowledge_bases` 表中是否有数据
2. 确认 `is_default` 字段为 `true`
3. 检查浏览器控制台是否有其他错误
4. 尝试清除浏览器缓存并刷新

