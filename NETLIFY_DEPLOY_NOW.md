# Netlify 部署操作指南

## ✅ 已完成
- ✅ Supabase 配置完成
- ✅ GitHub 代码已提交

## 📋 第三步：在 Netlify 上部署

### 3.1 登录 Netlify

1. **访问 Netlify**：https://www.netlify.com
2. **登录/注册**：
   - 点击右上角 **"Sign up"** 或 **"Log in"**
   - 选择 **"Sign up with GitHub"**（推荐，方便连接仓库）
   - 授权 Netlify 访问您的 GitHub 账号

### 3.2 导入项目

1. **进入 Dashboard**，点击 **"Add new site"**
2. **选择 "Import an existing project"**
3. **选择 "Deploy with GitHub"**
4. **首次使用需要授权**：
   - 点击 **"Authorize Netlify"**
   - 选择要授权的仓库（或选择所有仓库）
   - 点击 **"Install"**
5. **选择仓库**：
   - 在仓库列表中找到 `siegzhong-maker/knowledge`
   - 点击它

### 3.3 配置构建设置

在部署配置页面，设置以下内容：

**基本设置**：
- **Branch to deploy**: `main`（或您的默认分支）
- **Base directory**: 留空
- **Build command**: 留空（前端是静态文件，无需构建）
- **Publish directory**: 输入 `frontend`

### 3.4 配置环境变量 ⭐ 重要

在部署配置页面的 **"Environment variables"** 部分，点击 **"New variable"**，依次添加：

#### 变量 1：SUPABASE_URL
- **Key**: `SUPABASE_URL`
- **Value**: `https://qrpexoehzbdfbzgzvwsc.supabase.co`
- 点击 **"Add variable"**

#### 变量 2：SUPABASE_SERVICE_ROLE_KEY
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `sb_secret_kwK8Py_1bL5yfrBVeVHgcg_u6C8LJ7d`
- 点击 **"Add variable"**

#### 变量 3：NODE_ENV
- **Key**: `NODE_ENV`
- **Value**: `production`
- 点击 **"Add variable"**

#### 变量 4：DEEPSEEK_API_KEY（可选）
- **Key**: `DEEPSEEK_API_KEY`
- **Value**: 您的 DeepSeek API Key（如果有）
- 点击 **"Add variable"**

### 3.5 开始部署

1. **确认所有环境变量已添加**
2. **检查构建设置**：
   - Publish directory: `frontend`
   - Build command: 留空
3. **点击 "Deploy site"** 按钮

### 3.6 监控部署进度

1. **查看部署日志**：
   - 部署开始后，会自动跳转到部署详情页
   - 可以看到实时的构建日志

2. **等待部署完成**：
   - 通常需要 1-3 分钟
   - 看到 "Site is live" 表示部署成功

3. **获取站点 URL**：
   - 部署成功后，会显示站点 URL
   - 格式类似：`https://magnificent-quokka-afd826.netlify.app`
   - 或者您之前提到的：`https://app.netlify.com/projects/magnificent-quokka-afd826`

### 3.7 验证部署

1. **访问健康检查**：
   ```
   https://your-site.netlify.app/api/health
   ```
   应该返回 JSON：
   ```json
   {
     "success": true,
     "message": "服务运行正常",
     "timestamp": "..."
   }
   ```

2. **访问前端页面**：
   ```
   https://your-site.netlify.app
   ```
   应该能看到应用界面

## ✅ 完成标志

当您看到：
- ✅ "Site is live" 状态
- ✅ 可以访问站点 URL
- ✅ 健康检查返回成功

部署就完成了！

## 后续步骤

部署完成后：
1. 测试各个功能
2. 配置自定义域名（可选）
3. 设置自动部署（默认已启用）

## 故障排查

如果部署失败：
1. 检查部署日志中的错误信息
2. 确认环境变量是否正确
3. 检查 `netlify.toml` 配置
4. 查看 Functions 日志

## 快速参考

**您的 Supabase 信息**：
```
SUPABASE_URL=https://qrpexoehzbdfbzgzvwsc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_kwK8Py_1bL5yfrBVeVHgcg_u6C8LJ7d
```

**Netlify 构建设置**：
```
Publish directory: frontend
Build command: (留空)
```

