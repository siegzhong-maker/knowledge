const { Pool } = require('pg');

class Database {
  constructor() {
    this._pool = null;
  }

  get pool() {
    return this._pool;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        // 从环境变量获取数据库连接字符串
        const connectionString = process.env.DATABASE_URL;
        
        if (!connectionString) {
          return reject(new Error('DATABASE_URL environment variable is required for PostgreSQL'));
        }

        this._pool = new Pool({
          connectionString: connectionString,
          ssl: connectionString.includes('supabase') || connectionString.includes('amazonaws.com') 
            ? { rejectUnauthorized: false } 
            : false
        });

        // 测试连接
        this._pool.query('SELECT NOW()', (err, result) => {
          if (err) {
            reject(err);
          } else {
            console.log('✓ 已连接到PostgreSQL数据库');
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this._pool) {
        this._pool.end((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // 将SQLite的?占位符转换为PostgreSQL的$1, $2格式
  convertPlaceholders(sql) {
    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  }

  // 通用查询方法 - 返回单行
  async get(sql, params = []) {
    try {
      const convertedSql = this.convertPlaceholders(sql);
      const result = await this._pool.query(convertedSql, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Database get error:', error);
      throw error;
    }
  }

  // 通用查询方法 - 返回多行
  async all(sql, params = []) {
    try {
      const convertedSql = this.convertPlaceholders(sql);
      const result = await this._pool.query(convertedSql, params);
      return result.rows || [];
    } catch (error) {
      console.error('Database all error:', error);
      throw error;
    }
  }

  // 执行SQL语句（INSERT, UPDATE, DELETE）
  async run(sql, params = []) {
    try {
      const convertedSql = this.convertPlaceholders(sql);
      const result = await this._pool.query(convertedSql, params);
      
      // 返回与SQLite兼容的格式
      return {
        lastID: result.rows[0]?.id || null, // 如果有RETURNING id，则获取
        changes: result.rowCount || 0
      };
    } catch (error) {
      console.error('Database run error:', error);
      throw error;
    }
  }
}

// 单例模式
const db = new Database();

module.exports = db;

