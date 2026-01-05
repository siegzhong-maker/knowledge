# 快速修复：数据库有数据但文件无法显示

## 问题症状
- 数据库中有PDF记录（source_items表有数据）
- 但访问PDF时显示"PDF文件未找到"

## 最可能的原因

### 1. NODE_ENV未设置为production（最常见）

**检查方法：**
1. 在Railway中，打开Knowledge服务
2. 点击"Variables"标签
3. 查找`NODE_ENV`变量

**修复方法：**
- 如果`NODE_ENV`不存在或不是`production`，添加/修改：
  - 变量名：`NODE_ENV`
  - 变量值：`production`
- 保存后，Railway会自动重新部署

### 2. Volume未正确挂载

**检查方法：**
1. 在Railway中，打开Knowledge服务
2. 点击"Settings"标签
3. 向下滚动到"Volumes"部分
4. 确认是否有Volume挂载

**修复方法：**
- 如果没有Volume，添加：
  - 点击"+ New Volume"
  - Mount Path: `/data/uploads`
  - Name: `uploads`（可选）
  - 点击"Add"
- 保存后，Railway会自动重新部署

### 3. 文件路径格式问题

**检查方法：**
1. 在Railway中，打开Postgres服务
2. 点击"Database" → "Data" → `source_items`表
3. 查看`file_path`列的值
4. 应该类似：`1766969308057-xxx.pdf`（相对路径）

**如果file_path是绝对路径：**
- 可能需要更新数据库中的路径
- 或者等待系统自动修复（已添加多路径尝试机制）

## 部署后的验证

部署后，查看部署日志，应该看到：
- `✓ 上传目录已准备: /data/uploads`
- `✓ Volume挂载检查: /data/uploads 可访问`
- `✓ Volume文件检查: 发现 X 个文件/目录`

如果看到：
- `⚠️ Volume挂载警告` - 说明Volume未正确挂载
- `NODE_ENV: 未设置` - 需要设置NODE_ENV为production

## 测试文件访问

部署后，尝试访问一个PDF文件，查看日志：
- 如果成功：`✓ 找到文件 (相对路径): /data/uploads/xxx.pdf`
- 如果失败：会显示所有尝试的路径和失败原因

## 如果问题仍然存在

1. **查看详细日志**：
   - 在Railway的Deployments标签中查看最新部署日志
   - 查找"PDF文件请求"相关的日志
   - 查看尝试的路径列表

2. **运行诊断脚本**：
   - 在Railway控制台运行：`npm run diagnose`
   - 查看诊断结果

3. **检查Volume内容**：
   - 如果可能，通过Railway的Volume管理查看文件列表
   - 确认文件是否真的存在于Volume中

