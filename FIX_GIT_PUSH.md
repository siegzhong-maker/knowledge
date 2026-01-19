# 修复 Git Push 错误

## 问题

```
fatal: unable to access 'https://github.com/siegzhong-maker/knowledge.git/': Error in the HTTP2 framing layer
```

这是 HTTP/2 协议问题，通常由网络或 GitHub 服务器引起。

## 解决方案

### 方法 1：使用 HTTP/1.1（推荐）

在终端执行：

```bash
cd /Users/silas/Desktop/knowledge

# 为当前仓库配置 HTTP/1.1
git config http.version HTTP/1.1

# 重试推送
git push origin main
```

### 方法 2：临时禁用 HTTP/2（全局）

如果方法 1 不行，可以全局配置：

```bash
# 全局配置（需要权限）
git config --global http.version HTTP/1.1

# 重试推送
git push origin main
```

### 方法 3：使用 SSH 代替 HTTPS

如果 HTTP 问题持续，可以改用 SSH：

```bash
# 查看当前远程 URL
git remote -v

# 如果显示 https://，改为 SSH
git remote set-url origin git@github.com:siegzhong-maker/knowledge.git

# 推送
git push origin main
```

### 方法 4：重试（有时只是临时网络问题）

```bash
# 直接重试
git push origin main
```

## 验证

推送成功后，应该看到：
```
Enumerating objects: ...
Counting objects: ...
Writing objects: ...
To https://github.com/siegzhong-maker/knowledge.git
   [commit hash] -> main
```

## 下一步

推送成功后：
1. Netlify 会自动重新部署
2. 在 Netlify Dashboard 查看部署状态
3. 部署完成后，测试应用功能

