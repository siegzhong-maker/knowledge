# Railway Node.js 版本修复（最终方案）

## 问题

`nixpacks.toml` 文件中的语法不正确，导致构建失败：
```
error: undefined variable 'nodejs-20_x'
```

## 解决方案

Nixpacks 不能直接在 `nixpacks.toml` 中使用 `nodejs-20_x` 语法。应该使用以下方法：

### 方法 1: 使用环境变量（最简单）✅

在 Railway 环境变量中添加：

1. 在服务页面的 "Variables" 标签
2. 添加环境变量：
   - **Key**: `NODE_VERSION`
   - **Value**: `20`
3. 保存并重新部署

### 方法 2: 使用 package.json engines（已配置）✅

`package.json` 中已包含：
```json
"engines": {
  "node": ">=20.0.0"
}
```

Railway 会自动读取此配置。

### 方法 3: 删除 nixpacks.toml（已删除）

`nixpacks.toml` 文件已删除，因为语法不正确。

## 推荐配置

**在 Railway 环境变量中设置：**

1. `NODE_VERSION` = `20` ⭐（最重要）
2. `DATABASE_URL` = `postgresql://postgres:Zhong%40123ch@db.eibgzxvspsdlkrwwiqjx.supabase.co:5432/postgres`
3. `NODE_ENV` = `production`

## 步骤

1. ✅ 删除 `nixpacks.toml`（已删除）
2. ✅ 确保 `package.json` 中有 engines 字段（已有）
3. ⚠️ **在 Railway 环境变量中添加 `NODE_VERSION=20`**
4. 提交并推送代码（删除 nixpacks.toml 的更改）
5. Railway 会自动使用 Node.js 20

## 为什么 nixpacks.toml 不行？

Nixpacks 的语法复杂，`nodejs-20_x` 不是有效的 Nix 包名格式。Railway 推荐使用：
- 环境变量 `NODE_VERSION`
- `package.json` 的 `engines` 字段

这两种方法更简单、更可靠。

