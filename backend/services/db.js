// 根据环境变量选择数据库类型（SQLite 或 PostgreSQL）
const DATABASE_URL = process.env.DATABASE_URL;
const DB_TYPE = process.env.DB_TYPE;

// 如果设置了 DATABASE_URL，使用 PostgreSQL
if (DATABASE_URL || DB_TYPE === 'postgres') {
  module.exports = require('./db-pg');
} else {
  // 否则使用 SQLite（向后兼容）
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

  class Database {
    constructor() {
      this.db = null;
    }

    connect() {
      return new Promise((resolve, reject) => {
        this.db = new sqlite3.Database(dbPath, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✓ 已连接到SQLite数据库');
            resolve();
          }
        });
      });
    }

    close() {
      return new Promise((resolve, reject) => {
        if (this.db) {
          this.db.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        } else {
          resolve();
        }
      });
    }

    // 通用查询方法
    get(sql, params = []) {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

    all(sql, params = []) {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }

    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    }
  }

  // 单例模式
  const db = new Database();
  module.exports = db;
}

