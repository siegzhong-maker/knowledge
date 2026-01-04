# Railway Volume 持久化存储配置指南

## 问题说明

在Railway部署时，容器的文件系统是临时性的。重新部署后，`backend/uploads`目录中的PDF文件会丢失。为了解决这个问题，需要使用Railway Volume来持久化存储PDF文件。

## 解决方案

使用Railway Volume将PDF文件存储到持久化卷中，即使重新部署，文件也不会丢失。

## 配置步骤

### 1. 在Railway中创建Volume

1. 登录 [Railway Dashboard](https://railway.app)
2. 进入你的项目
3. 选择你的Web服务（knowledge-manager）
4. 点击 **"Settings"** 标签
5. 滚动到 **"Volumes"** 部分
6. 点击 **"+ New Volume"**
7. 配置Volume：
   - **Mount Path**: `/data/uploads`
   - **Name**: `uploads` (可选，用于标识)
8. 点击 **"Add"** 保存

### 2. 配置环境变量（可选）

如果Volume挂载点不是`/data/uploads`，可以通过环境变量自定义：

1. 在Railway服务页面，点击 **"Variables"** 标签
2. 点击 **"+ New Variable"**
3. 添加变量：
   - **Key**: `UPLOADS_PATH`
   - **Value**: `/data/uploads` (或你的Volume挂载路径)
4. 点击 **"Add"** 保存

### 3. 验证配置

部署后，检查日志应该看到：
```
✓ 上传目录已准备: /data/uploads
```

### 4. 迁移现有文件（如果需要）

如果你有现有的PDF文件在临时目录中，需要手动迁移：

1. 通过Railway CLI或临时脚本访问容器
2. 将文件从临时目录复制到Volume目录：
   ```bash
   # 如果文件在 backend/uploads
   cp -r backend/uploads/* /data/uploads/
   ```

或者使用数据库迁移脚本（如果文件路径已存储在数据库中，需要更新路径）。

## 环境变量说明

- `UPLOADS_PATH`: 上传目录路径（可选）
  - 如果不设置，生产环境默认使用 `/data/uploads`
  - 开发环境默认使用 `backend/uploads`
- `NODE_ENV`: 环境类型（production/development）

## 注意事项

1. **Volume大小限制**：Railway免费计划可能有Volume大小限制，请查看Railway文档
2. **备份**：虽然Volume是持久化的，但建议定期备份重要文件
3. **路径一致性**：确保所有服务使用相同的路径配置

## 故障排查

### 问题：文件仍然丢失

1. 检查Volume是否正确挂载：
   - 在Railway服务日志中查看启动信息
   - 确认看到 `✓ 上传目录已准备: /data/uploads`

2. 检查环境变量：
   - 确认 `UPLOADS_PATH` 环境变量设置正确（如果需要）
   - 确认 `NODE_ENV=production`

3. 检查Volume状态：
   - 在Railway服务设置中查看Volume状态
   - 确认Volume已正确挂载到服务

### 问题：权限错误

如果遇到权限错误，可能需要调整Volume权限。Railway通常会自动处理权限，但如果遇到问题，可以联系Railway支持。

## 相关文件

- `backend/routes/upload.js`: PDF上传路由
- `backend/routes/files.js`: PDF文件服务路由
- `backend/server.js`: 服务器启动文件（包含启动检查）

