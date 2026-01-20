# 如何获取 Supabase PostgreSQL 连接字符串（DATABASE_URL）

## 📍 位置

Supabase PostgreSQL 连接字符串在 **Supabase Dashboard > Settings > Database** 页面中。

## 🔍 详细步骤

### 1. 打开 Supabase Dashboard

1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 选择您的项目：`knowledge-manager`
3. 确保在 **PRODUCTION** 分支（您当前已经在正确的分支）

### 2. 进入 Database Settings

在左侧导航栏中：
1. 找到 **"Settings"** 部分（您当前在 "API Keys" 页面）
2. 在 **"CONFIGURATION"** 部分，点击 **"Database"**（带箭头图标）
3. 或者直接访问：`https://app.supabase.com/project/qrpexoehzbdfbzgzvwsc/settings/database`

### 3. 找到 Connection String

在 Database Settings 页面中，向下滚动，您会看到：

#### **Connection string** 部分（在 Connection pooling configuration 下方）

通常显示为：

1. **Connection string** 标题
2. 一个代码框，显示类似这样的内容：
   ```
   postgresql://postgres.qrpexoehzbdfbzgzvwsc:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

**如果看不到连接字符串**：
- 向下滚动页面
- 连接字符串通常在 "Connection pooling configuration" 部分的下方
- 或者查找 "Connection string" 或 "Connection info" 标题
- 可能在一个可展开的代码块中

### 4. 选择连接字符串类型

**推荐使用 "Connection pooling" 模式**，因为：
- 更适合生产环境
- 可以处理更多并发连接
- 性能更好

### 5. 复制连接字符串

1. 在 "Connection string" 部分，找到您需要的模式（URI 或 Connection pooling）
2. 点击连接字符串旁边的 **复制图标** 📋
3. 连接字符串格式示例：
   ```
   postgresql://postgres.qrpexoehzbdfbzgzvwsc:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### 6. 替换密码

连接字符串中的 `[YOUR_PASSWORD]` 需要替换为您创建项目时设置的数据库密码。

**您的数据库密码**：`Zhong@123a2`

所以完整的连接字符串应该是：
```
postgresql://postgres.qrpexoehzbdfbzgzvwsc:Zhong@123a2@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**注意**：
- 如果您的项目区域不是 `us-east-1`，请替换为正确的区域
- 密码中的特殊字符（如 `@`）需要进行 URL 编码：
  - `@` → `%40`
  - 所以 `Zhong@123a2` 应该编码为 `Zhong%40123a2`

**最终连接字符串**：
```
postgresql://postgres.qrpexoehzbdfbzgzvwsc:Zhong%40123a2@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## 🔐 在 Netlify 中配置

1. 打开 Netlify Dashboard
2. 进入您的项目 > **Site settings** > **Environment variables**
3. 添加新变量：
   - **Key**: `DATABASE_URL`
   - **Value**: 粘贴上面复制的完整连接字符串（包含编码后的密码）
4. 点击 **Save**

## ⚠️ 重要提示

1. **密码编码**：如果密码包含特殊字符（如 `@`, `#`, `%` 等），需要进行 URL 编码
   - 可以使用在线工具：https://www.urlencoder.org/
   - 或者使用 JavaScript：`encodeURIComponent('Zhong@123a2')`

2. **区域检查**：确认您的项目区域
   - 在 Supabase Dashboard > Settings > General 中可以查看项目区域
   - 连接字符串中的区域必须匹配

3. **安全**：
   - 不要将连接字符串提交到 Git 仓库
   - 只在 Netlify 环境变量中配置
   - 连接字符串包含数据库密码，请妥善保管

## 🧪 验证连接字符串

您可以使用以下方法验证连接字符串是否正确：

### 方法 1：使用 psql 命令行工具

```bash
psql "postgresql://postgres.qrpexoehzbdfbzgzvwsc:Zhong%40123a2@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

### 方法 2：在代码中测试

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('连接失败:', err);
  } else {
    console.log('连接成功:', res.rows[0]);
  }
  pool.end();
});
```

## 📝 快速参考

- **项目 URL**: `https://qrpexoehzbdfbzgzvwsc.supabase.co`
- **项目引用**: `qrpexoehzbdfbzgzvwsc`
- **数据库密码**: `Zhong@123a2`（URL 编码后：`Zhong%40123a2`）
- **连接字符串模板**: 
  ```
  postgresql://postgres.[PROJECT_REF]:[ENCODED_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  ```

## 🆘 如果找不到 Connection String

如果 Database Settings 页面中没有显示 Connection String：

1. 检查您是否有项目访问权限
2. 确认项目已完全创建（可能需要等待几分钟）
3. 尝试刷新页面
4. 查看 Supabase 文档：https://supabase.com/docs/guides/database/connecting-to-postgres

