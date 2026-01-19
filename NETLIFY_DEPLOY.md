# Netlify 部署指南

本文档说明如何将 knowledge 项目部署到 Netlify 平台。

## 前置要求

1. **Netlify 账号**：在 [Netlify](https://www.netlify.com) 注册账号
2. **Supabase 账号**：在 [Supabase](https://supabase.com) 创建项目
3. **GitHub 仓库**：确保代码已推送到 GitHub

## 部署步骤

### 1. 配置 Supabase 数据库

#### 1.1 创建 Supabase 项目

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 点击 "New Project"
3. 填写项目信息并创建

#### 1.2 初始化数据库表结构

1. 在 Supabase Dashboard 中，进入 "SQL Editor"
2. 执行 `supabase/migrations/001_initial_schema.sql` 文件中的 SQL 语句
3. 确认所有表已创建成功

#### 1.3 获取 Supabase 凭证

1. 在 Supabase Dashboard 中，进入 "Settings" > "API"
2. 复制以下信息：
   - **Project URL** (SUPABASE_URL)
   - **service_role key** (SUPABASE_SERVICE_ROLE_KEY) - 注意：这是敏感信息，不要在前端使用

### 2. 配置 Netlify 项目

#### 2.1 连接 GitHub 仓库

1. 登录 [Netlify Dashboard](https://app.netlify.com)
2. 点击 "Add new site" > "Import an existing project"
3. 选择 GitHub 并授权
4. 选择 `siegzhong-maker/knowledge` 仓库
5. 配置构建设置：
   - **Base directory**: 留空
   - **Build command**: 留空（前端是静态文件）
   - **Publish directory**: `frontend`

#### 2.2 配置环境变量

在 Netlify Dashboard 中，进入 "Site settings" > "Environment variables"，添加以下变量：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEEPSEEK_API_KEY=your-deepseek-api-key (可选，用户可以在前端配置)
NODE_ENV=production
```

### 3. 部署配置说明

#### 3.1 项目结构

```
knowledge/
├── frontend/              # 前端静态文件（发布目录）
├── netlify/
│   └── functions/         # Netlify Functions
│       ├── health.js      # 健康检查
│       ├── items.js       # 文档管理 API
│       ├── upload.js      # 文件上传 API
│       └── utils/         # 工具函数
│           ├── db.js      # Supabase 数据库连接
│           └── helpers.js # 辅助函数
├── netlify.toml           # Netlify 配置文件
└── supabase/
    └── migrations/        # 数据库迁移文件
```

#### 3.2 API 路由

当前已实现的 Netlify Functions：
- `/api/health` - 健康检查
- `/api/items/*` - 文档管理（GET, POST, PUT, DELETE）

**注意**：其他 API 路由（如 `/api/knowledge/*`, `/api/ai/*` 等）需要创建对应的 Netlify Functions。

### 4. 文件存储配置

#### 4.1 使用 Supabase Storage

1. 在 Supabase Dashboard 中，进入 "Storage"
2. 创建新的 bucket（例如：`uploads`）
3. 配置 bucket 权限（Public 或 Private）
4. 在前端代码中使用 Supabase Storage 客户端直接上传文件

#### 4.2 文件上传流程

1. 前端使用 Supabase Storage 客户端上传文件
2. 获取文件 URL
3. 调用 `/api/upload` 创建文档记录

### 5. 本地开发

#### 5.1 安装依赖

```bash
npm install
```

#### 5.2 配置本地环境变量

创建 `.env` 文件：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

#### 5.3 运行本地开发服务器

```bash
# 安装 Netlify CLI（如果还没有）
npm install -g netlify-cli

# 启动本地开发服务器
netlify dev
```

这将启动本地服务器，模拟 Netlify Functions 环境。

### 6. 部署后检查

1. **健康检查**：访问 `https://your-site.netlify.app/api/health`
2. **前端页面**：访问 `https://your-site.netlify.app`
3. **API 测试**：使用浏览器开发者工具或 Postman 测试 API 端点

### 7. 注意事项

#### 7.1 Netlify Functions 限制

- **超时时间**：免费版 10 秒，Pro 版 26 秒
- **文件大小**：请求体最大 6MB
- **内存**：免费版 1024MB，Pro 版 3008MB

#### 7.2 长时间运行的任务

对于 AI 知识提取等长时间运行的任务，建议：
1. 使用异步处理（后台任务）
2. 使用 Netlify Background Functions（需要 Pro 计划）
3. 或使用外部服务（如 Supabase Edge Functions）

#### 7.3 数据库连接

- Supabase 使用 PostgreSQL，连接数有限制
- 建议使用连接池
- 生产环境建议使用 Supabase 的连接池配置

### 8. 故障排查

#### 8.1 Functions 不工作

1. 检查 `netlify.toml` 中的重定向规则
2. 检查 Functions 日志（Netlify Dashboard > Functions）
3. 确认环境变量已正确配置

#### 8.2 数据库连接失败

1. 检查 Supabase URL 和 Key 是否正确
2. 检查 Supabase 项目是否正常运行
3. 检查网络连接和防火墙设置

#### 8.3 文件上传失败

1. 检查 Supabase Storage bucket 配置
2. 检查文件大小是否超过限制
3. 检查 bucket 权限设置

### 9. 后续优化

1. **创建更多 Netlify Functions**：转换剩余的 Express 路由
2. **优化数据库查询**：使用 Supabase 的索引和查询优化
3. **添加缓存**：使用 Netlify Edge Functions 或 CDN 缓存
4. **监控和日志**：配置 Netlify Analytics 和日志收集

## 相关链接

- [Netlify 文档](https://docs.netlify.com/)
- [Supabase 文档](https://supabase.com/docs)
- [Netlify Functions 文档](https://docs.netlify.com/functions/overview/)
- [Supabase Storage 文档](https://supabase.com/docs/guides/storage)

