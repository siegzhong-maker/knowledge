const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 支持环境变量配置数据库路径（Railway部署时使用）
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

// 创建表
db.serialize(() => {
  // source_items 表 - 扩展支持PDF类型
  db.run(`
    CREATE TABLE IF NOT EXISTS source_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('text', 'link', 'memo', 'pdf')),
      title TEXT NOT NULL,
      raw_content TEXT,
      original_url TEXT,
      summary_ai TEXT,
      source TEXT,
      tags TEXT DEFAULT '[]',
      file_path TEXT,
      page_count INTEGER,
      page_content TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'archived'))
    )
  `, (err) => {
    if (err) {
      console.error('创建source_items表失败:', err.message);
    } else {
      console.log('✓ source_items表已创建');
    }
  });

  // 为现有表添加新字段（如果不存在）
  db.run(`ALTER TABLE source_items ADD COLUMN file_path TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('添加file_path字段失败:', err.message);
    }
  });
  db.run(`ALTER TABLE source_items ADD COLUMN page_count INTEGER`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('添加page_count字段失败:', err.message);
    }
  });
  db.run(`ALTER TABLE source_items ADD COLUMN page_content TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('添加page_content字段失败:', err.message);
    }
  });

  // tags 表
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#6366f1',
      count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('创建tags表失败:', err.message);
    } else {
      console.log('✓ tags表已创建');
    }
  });

  // settings 表
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('创建settings表失败:', err.message);
    } else {
      console.log('✓ settings表已创建');
    }
  });

  // user_contexts 表 - 用户背景档案
  db.run(`
    CREATE TABLE IF NOT EXISTS user_contexts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      context_data TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('创建user_contexts表失败:', err.message);
    } else {
      console.log('✓ user_contexts表已创建');
    }
  });

  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_items_type ON source_items(type)`, (err) => {
    if (err) console.error('创建索引失败:', err.message);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_items_status ON source_items(status)`, (err) => {
    if (err) console.error('创建索引失败:', err.message);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_items_created_at ON source_items(created_at DESC)`, (err) => {
    if (err) console.error('创建索引失败:', err.message);
  });

  db.close((err) => {
    if (err) {
      console.error('关闭数据库连接失败:', err.message);
    } else {
      console.log('✓ 数据库初始化完成');
    }
  });
});

