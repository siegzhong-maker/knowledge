# 修复文档 API 问题

## 问题

从控制台错误看到：
- `API请求失败: Error:文档不存在`
- `加载统计信息失败: Error: 文档不存在`
- PDF 文档显示 "0页"

## 原因

1. **缺少 `/api/items/stats` 端点**：前端调用 `itemsAPI.getStats()`，但 Netlify Function 中没有处理这个路由
2. **路径解析可能有问题**：需要添加调试日志来诊断

## ✅ 已修复

### 1. 添加统计 API 端点

在 `netlify/functions/items.js` 中添加了：

```javascript
// GET /api/items/stats - 获取统计信息
if (method === 'GET' && path === '/stats') {
  // 返回总数、各类型数量、已提取数量、今日新增等
}
```

### 2. 改进文档详情 API

- 添加了调试日志
- 改进了错误处理
- 添加了空数据检查

## 验证

修复后，应该：
1. ✅ 不再出现 "加载统计信息失败" 错误
2. ✅ 可以正常获取文档详情
3. ✅ PDF 页数应该能正确显示

## 如果还是不行

### 检查 Netlify Function 日志

1. 打开 Netlify Dashboard
2. 进入 Functions > items
3. 查看日志，应该能看到：
   - `获取文档详情: { id: '...', path: '...', eventPath: '...' }`
   - `文档查询成功: { id: '...', type: 'pdf', hasFilePath: true }`

### 检查数据库

在 Supabase SQL Editor 中执行：

```sql
-- 查看所有文档
SELECT id, type, title, file_path, page_count, created_at 
FROM source_items 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看特定文档（替换 YOUR_DOC_ID）
SELECT * FROM source_items WHERE id = 'YOUR_DOC_ID';
```

### 检查文件路径

确认 `file_path` 字段：
- 应该是 Supabase Storage 的完整 URL
- 或者相对路径（如 `uploads/xxx.pdf`）

如果是相对路径，`files.js` Function 会自动转换为完整 URL。

## 下一步

1. 提交并推送代码
2. 等待 Netlify 重新部署
3. 刷新应用页面
4. 检查控制台是否还有错误
5. 测试文档详情加载

