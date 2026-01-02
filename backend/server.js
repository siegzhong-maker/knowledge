const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./services/db');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS配置 - 允许移动端和Web端访问
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // 生产环境建议设置具体域名
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 中间件
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（前端）
app.use(express.static(path.join(__dirname, '../frontend')));

// 路由
app.use('/api/items', require('./routes/items'));
app.use('/api/parse', require('./routes/parse'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/export', require('./routes/export'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/consultation', require('./routes/consultation'));
app.use('/api/contexts', require('./routes/context'));
app.use('/api/modules', require('./routes/modules'));
app.use('/api/knowledge-bases', require('./routes/knowledge-bases'));
app.use('/api/files', require('./routes/files'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务运行正常' });
});

// 404处理 - API路由未找到（必须在所有API路由之后）
app.use('/api/*', (req, res) => {
  // 记录未匹配的路由，用于调试
  console.log(`[404] 未匹配的API路由: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: `API端点 ${req.method} ${req.path} 不存在` 
  });
});

// 404处理 - 前端路由（SPA支持）
app.get('*', (req, res) => {
  // 如果是API请求，已经在上面的中间件处理了
  // 这里只处理前端路由，返回index.html
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await db.connect();
    console.log('✓ 数据库连接成功');

    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`✓ 服务器运行在 http://localhost:${PORT}`);
      console.log(`✓ 前端访问: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭服务器...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n正在关闭服务器...');
  await db.close();
  process.exit(0);
});

startServer();

