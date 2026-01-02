const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 支持环境变量配置数据库路径
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/knowledge.db');

// 确保数据库目录存在
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('已连接到SQLite数据库');
});

db.serialize(() => {
  // 1. 创建知识库表
  db.run(`
    CREATE TABLE IF NOT EXISTS knowledge_bases (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'book',
      color TEXT DEFAULT '#6366f1',
      is_default INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('创建knowledge_bases表失败:', err.message);
    } else {
      console.log('✓ knowledge_bases表已创建');
    }
  });

  // 2. 插入默认知识库（创业流程）
  const defaultKbId = 'kb-entrepreneurship';
  const now = Date.now();
  
  db.run(`
    INSERT OR REPLACE INTO knowledge_bases 
    (id, name, description, icon, color, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    defaultKbId,
    '创业流程',
    '6步18关创业知识体系',
    'rocket',
    '#6366f1',
    1, // 默认知识库
    now,
    now
  ], (err) => {
    if (err) {
      console.error('插入默认知识库失败:', err.message);
    } else {
      console.log('✓ 已创建默认知识库：创业流程');
    }
    
    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
      } else {
        console.log('知识库表创建完成');
      }
      process.exit(0);
    });
  });
});

