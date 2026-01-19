# 配置 Supabase Anon Key（用于前端文件上传）

## 问题

文件上传功能需要 Supabase anon key 才能工作。anon key 是公开的，可以安全地在前端使用。

## 获取 Anon Key

1. **访问 Supabase Dashboard**：https://app.supabase.com
2. **选择您的项目**（URL 包含 `qrpexoehzbdfbzgzvwsc`）
3. **进入 Settings > API**
4. **找到 "Project API keys" 部分**
5. **复制 "anon" "public" key**（不是 service_role key）

## 配置方法

### 方法一：在 HTML 中直接配置（快速）

编辑 `frontend/index.html`，找到：

```javascript
window.SUPABASE_ANON_KEY = null; // 需要配置
```

替换为：

```javascript
window.SUPABASE_ANON_KEY = '您的 anon key';
```

### 方法二：通过 Netlify 环境变量注入（推荐）

1. 在 Netlify Dashboard，进入 **Site settings > Environment variables**
2. 添加新变量：
   - **Key**: `SUPABASE_ANON_KEY`
   - **Value**: 您的 anon key
3. 在构建时注入到 HTML（需要修改构建脚本）

### 方法三：通过 API 动态获取（已实现）

代码已经实现了从 API 获取配置的功能，但需要先配置 anon key。

## 临时解决方案

如果暂时无法配置，可以：

1. 在浏览器控制台临时设置：
   ```javascript
   window.SUPABASE_ANON_KEY = '您的 anon key';
   ```

2. 然后重试上传

## 验证

配置完成后，文件上传功能应该可以正常工作。

## 安全提示

- ✅ anon key 是公开的，可以安全地在前端使用
- ✅ anon key 受 Row Level Security (RLS) 保护
- ❌ 不要使用 service_role key 在前端（有完整权限）

