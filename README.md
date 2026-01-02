# 知识管理系统

基于PRD和原型设计的第一期MVP版本，专注于文本内容的采集、管理和DeepSeek AI辅助处理。

## 功能特性

### 第一期功能（文本处理）

- ✅ URL链接解析（提取网页文本内容）
- ✅ 纯文本直接输入
- ✅ Memo灵感笔记
- ✅ DeepSeek AI摘要生成
- ✅ AI对话功能（上下文感知）
- ✅ 标签管理
- ✅ 知识库管理
- ✅ 数据导出

## 技术栈

- **前端**: Vanilla JavaScript + HTML/CSS (Tailwind CSS)
- **后端**: Node.js + Express
- **数据库**: SQLite
- **AI服务**: DeepSeek API

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run init-db
```

### 3. 启动后端服务

```bash
npm run dev
```

后端服务将在 `http://localhost:3000` 启动

### 4. 打开前端

直接在浏览器打开 `frontend/index.html`，或使用简单的HTTP服务器：

```bash
# 使用Python
cd frontend
python -m http.server 8080

# 或使用Node.js http-server
npx http-server frontend -p 8080
```

### 5. 配置API Key

1. 在侧边栏底部点击用户头像或设置图标
2. 输入DeepSeek API Key（在 https://platform.deepseek.com 获取）
3. 点击"测试连接"验证
4. 保存设置

## 项目结构

```
knowledge/
├── frontend/           # 前端代码
│   ├── index.html      # 主页面
│   ├── css/            # 样式文件
│   ├── js/             # JavaScript模块
│   └── assets/         # 静态资源
├── backend/            # 后端代码
│   ├── server.js       # Express服务器入口
│   ├── routes/         # 路由模块
│   ├── services/       # 业务逻辑
│   ├── models/         # 数据模型
│   └── scripts/        # 脚本工具
├── database/           # SQLite数据库文件
└── package.json
```

## API端点

### 知识项
- `GET /api/items` - 获取知识项列表
- `GET /api/items/:id` - 获取单个知识项
- `POST /api/items` - 创建知识项
- `PUT /api/items/:id` - 更新知识项
- `DELETE /api/items/:id` - 删除知识项

### URL解析
- `POST /api/parse/url` - 解析URL并提取文本

### AI功能
- `POST /api/ai/summary` - 生成摘要
- `POST /api/ai/chat` - AI对话（流式）
- `POST /api/ai/suggest-tags` - 标签建议

### 设置
- `GET /api/settings` - 获取设置
- `PUT /api/settings` - 更新设置
- `POST /api/settings/test-api` - 测试API连接

### 标签
- `GET /api/tags` - 获取所有标签
- `POST /api/tags` - 创建标签
- `PUT /api/tags/:id` - 更新标签

## 开发计划

第一期专注于文本功能，后续版本将支持：
- 文件上传（PDF、Word等）
- 图片OCR识别
- 视频内容处理

## 许可证

MIT

