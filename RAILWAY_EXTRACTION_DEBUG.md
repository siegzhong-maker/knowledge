# Railway 知识提取问题诊断指南

## 快速诊断

### 方法1：使用诊断端点（推荐）

在浏览器中访问：
```
https://knowledge-production-d36c.up.railway.app/api/diagnose/extraction
```

**将 `your-app` 替换为你的Railway应用名称**

这个端点会自动检查：
- ✅ API Key 是否已配置
- ✅ API Key 是否有效
- ✅ 数据库连接是否正常
- ✅ 数据库表是否存在
- ✅ 最近是否有知识点记录

### 返回结果说明

```json
{
  "success": true,
  "data": {
    "apiKey": {
      "configured": true/false,    // API Key是否已配置
      "valid": true/false,         // API Key是否有效
      "source": "database",        // API Key来源
      "testResult": "连接成功"     // 测试结果
    },
    "database": {
      "connected": true/false,     // 数据库是否连接
      "tablesExist": true/false,  // 表是否存在
      "knowledgeItemsTable": true/false,  // 知识点表是否存在
      "recentKnowledgeItems": 5    // 最近24小时的知识点数量
    },
    "recommendations": [           // 修复建议
      "✅ 所有检查通过！"
    ]
  }
}
```

## 常见问题排查

### 问题1：API Key 未配置

**症状：**
- `apiKey.configured: false`
- 提取时 `extractedCount: 0`

**解决方法：**

**方法A：在前端设置中配置（推荐）**
1. 打开应用
2. 点击设置图标
3. 输入 DeepSeek API Key
4. 点击"测试连接"验证
5. 保存设置

**方法B：在数据库中添加全局API Key**
在Railway服务终端中运行：
```bash
railway run node backend/scripts/setup-api-key.js sk-your-api-key-here
```

### 问题2：API Key 无效

**症状：**
- `apiKey.configured: true`
- `apiKey.valid: false`
- `apiKey.testResult: "API Key无效"`

**解决方法：**
1. 检查API Key是否正确（应以 `sk-` 开头）
2. 确认API Key未过期
3. 确认API Key有足够的配额
4. 在 https://platform.deepseek.com 检查API Key状态

### 问题3：数据库表不存在

**症状：**
- `database.tablesExist: false`
- `database.knowledgeItemsTable: false`
- 提取时保存失败

**解决方法：**
在Railway服务终端中运行：
```bash
railway run npm run init-db
```

或者：
```bash
railway run node backend/scripts/init-db-pg.js
```

### 问题4：数据库连接失败

**症状：**
- `database.connected: false`
- `database.error: "数据库连接失败"`

**解决方法：**
1. 检查Railway PostgreSQL服务状态是否为 "Online"
2. 确认 `DATABASE_URL` 环境变量已正确注入
3. 在Railway Dashboard中检查PostgreSQL服务日志

### 问题5：提取完成但知识点为0

**症状：**
- 提取任务状态为 `completed`
- `extractedCount: 0`
- `knowledgeItemIds: []`

**可能原因：**
1. AI未返回知识点数据
2. JSON解析失败
3. 数据验证失败
4. 数据库保存失败

**排查步骤：**

1. **查看Railway日志**
   - 在Railway Dashboard中打开服务
   - 点击 "Deployments" > 最新部署 > "Logs"
   - 搜索 `[提取]` 和 `[保存]` 相关日志

2. **检查关键日志**
   - `[提取] ❌ DeepSeek API调用失败` - API调用问题
   - `[提取] ❌ JSON解析完全失败` - 响应格式问题
   - `[保存] ❌ 数据库插入失败` - 数据库问题
   - `[提取] ⚠️ 未提取到任何知识点` - AI未返回数据

3. **使用诊断端点**
   访问 `/api/diagnose/extraction` 查看详细诊断信息

## 查看Railway日志

### 方法1：通过Railway Dashboard

1. 登录 [Railway Dashboard](https://railway.app)
2. 进入你的项目
3. 点击Web服务名称
4. 点击 "Deployments"
5. 选择最新的部署
6. 点击 "Logs" 标签页
7. 使用搜索功能查找关键词：
   - `[提取]` - 提取相关日志
   - `[保存]` - 保存相关日志
   - `[AI]` - AI调用相关日志
   - `[后端]` - 后端路由日志

### 方法2：使用Railway CLI

```bash
# 安装Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 连接到项目
railway link

# 查看实时日志
railway logs

# 过滤提取相关日志
railway logs | grep "\[提取\]"
```

## 关键日志标识

### 成功日志
- `[提取] ✅ 提取完成` - AI成功提取知识点
- `[保存] ✅ 数据库插入成功` - 知识点成功保存
- `[后端] ✅ 提取完成，已保存知识点ID` - 提取任务完成

### 警告日志
- `[提取] ⚠️ 未提取到任何知识点` - AI未返回数据
- `[后端] ⚠️ 提取完成但没有知识点ID` - 提取完成但ID为空

### 错误日志
- `[AI] ❌ DeepSeek API调用失败` - API调用失败
- `[提取] ❌ 知识提取失败` - 提取过程失败
- `[保存] ❌ 数据库插入失败` - 保存失败

## 测试提取功能

### 步骤1：确认环境正常

访问诊断端点：
```
https://your-app.up.railway.app/api/diagnose/extraction
```

确保所有检查项都通过。

### 步骤2：测试简单提取

1. 在前端创建一个简单的文本文档
2. 点击"提取知识"
3. 观察提取进度
4. 检查是否成功生成知识点

### 步骤3：查看结果

- 如果成功：知识点会出现在知识库中
- 如果失败：查看Railway日志中的错误信息

## 环境变量检查

确保以下环境变量已正确设置：

- `DATABASE_URL` - PostgreSQL连接字符串（Railway自动注入）
- `NODE_ENV` - 环境类型（Railway自动设置为 `production`）
- `PORT` - 服务端口（Railway自动设置）

**注意：** DeepSeek API Key 不需要环境变量，应该保存在数据库中或通过前端设置。

## 联系支持

如果以上方法都无法解决问题：

1. 收集以下信息：
   - 诊断端点返回的完整JSON
   - Railway日志中的错误信息（特别是 `[提取]` 和 `[保存]` 相关）
   - 提取任务的 `extractionId`

2. 检查：
   - Railway服务状态
   - PostgreSQL服务状态
   - 网络连接（Railway能否访问 api.deepseek.com）

## 相关文档

- `DEBUG_EXTRACTION.md` - 详细的调试查询指南
- `RAILWAY_DEPLOY.md` - Railway部署指南
- `README.md` - 项目说明文档

