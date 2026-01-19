# Netlify 环境变量检查清单

## ✅ 已配置的环境变量

从您的截图看，您已经配置了：

1. ✅ **DB_TYPE** = `postgres`
2. ✅ **NODE_ENV** = `production`
3. ✅ **SUPABASE_URL** = `https://qrpexoehzbdfbzgzvwsc.supabase.co`

## ❌ 还缺少的环境变量

### 必须添加（重要！）

4. ⭐ **SUPABASE_SERVICE_ROLE_KEY**
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: `sb_secret_kwK8Py_1bL5yfrBVeVHgcg_u6C8LJ7d`
   - **说明**: 这是 Supabase 的 Secret Key，用于服务器端访问数据库
   - **必须添加**，否则 Netlify Functions 无法连接数据库

### 可选添加

5. **DEEPSEEK_API_KEY**（可选）
   - 如果用户可以在前端配置 API Key，可以跳过
   - 如果需要全局配置，可以添加

6. **ENCRYPTION_KEY**（可选）
   - 用于加密存储的 API Key
   - 如果不需要加密功能，可以跳过

## 添加 SUPABASE_SERVICE_ROLE_KEY 的步骤

1. 在 Netlify 环境变量页面，点击 **"Add a variable"** 按钮
2. 填写：
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: `sb_secret_kwK8Py_1bL5yfrBVeVHgcg_u6C8LJ7d`
3. 选择作用域（建议选择 "All scopes"）
4. 点击 **"Add variable"**

## 验证

添加完成后，您应该看到 4 个环境变量：
- ✅ DB_TYPE
- ✅ NODE_ENV
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY

## 重要提示

⚠️ **SUPABASE_SERVICE_ROLE_KEY 是必须的**，没有它：
- Netlify Functions 无法连接 Supabase 数据库
- API 端点会返回错误
- 应用无法正常工作

添加完 SUPABASE_SERVICE_ROLE_KEY 后，可以重新部署或等待自动部署。

