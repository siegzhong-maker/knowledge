#!/usr/bin/env node

/**
 * 添加 knowledge_extracted 字段到 source_items 表
 * 
 * 此脚本会：
 * 1. 检测数据库类型（SQLite/PostgreSQL）
 * 2. 添加 knowledge_extracted 字段（如果不存在）
 * 3. 基于现有知识点数据初始化字段值
 * 
 * 用法：
 *   - SQLite: node backend/scripts/add-knowledge-extracted-field.js
 *   - PostgreSQL: DATABASE_URL="postgresql://..." node backend/scripts/add-knowledge-extracted-field.js
 */

const DATABASE_URL = process.env.DATABASE_URL;
const DB_TYPE = process.env.DB_TYPE;

// 检查是否使用PostgreSQL
if (DATABASE_URL || DB_TYPE === 'postgres') {
  // 使用PostgreSQL迁移
  const { Pool } = require('pg');
  const dns = require('dns');

  // 强制使用 IPv4 解析
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }

  async function migratePostgreSQL() {
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL && (DATABASE_URL.includes('supabase') || DATABASE_URL.includes('amazonaws.com'))
        ? { rejectUnauthorized: false }
        : false
    });

    try {
      console.log('🔧 开始为 PostgreSQL 数据库添加 knowledge_extracted 字段...\n');

      // 测试连接
      await pool.query('SELECT NOW()');
      console.log('✓ 数据库连接成功\n');

      // 1. 检查字段是否存在
      console.log('1️⃣  检查 knowledge_extracted 字段是否存在...');
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'source_items'
        AND column_name = 'knowledge_extracted'
      `);

      if (columnCheck.rows.length > 0) {
        console.log('   ✓ knowledge_extracted 字段已存在，跳过添加\n');
      } else {
        // 2. 添加字段
        console.log('2️⃣  添加 knowledge_extracted 字段...');
        await pool.query(`
          ALTER TABLE source_items 
          ADD COLUMN knowledge_extracted BOOLEAN DEFAULT FALSE
        `);
        console.log('   ✓ knowledge_extracted 字段已添加\n');
      }

      // 3. 初始化现有数据：检查哪些文档已经有知识点，标记为已提取
      console.log('3️⃣  初始化现有数据...');
      const updateResult = await pool.query(`
        UPDATE source_items
        SET knowledge_extracted = TRUE
        WHERE id IN (
          SELECT DISTINCT source_item_id 
          FROM personal_knowledge_items 
          WHERE source_item_id IS NOT NULL
        )
        AND (knowledge_extracted IS NULL OR knowledge_extracted = FALSE)
      `);
      console.log(`   ✓ 已将 ${updateResult.rowCount} 个已有知识点的文档标记为已提取\n`);

      // 4. 创建索引（可选，用于优化筛选查询）
      console.log('4️⃣  创建索引...');
      try {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_source_items_knowledge_extracted 
          ON source_items(knowledge_extracted)
        `);
        console.log('   ✓ 索引已创建\n');
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.warn('   ⚠️  创建索引时出现警告:', err.message);
        } else {
          console.log('   ✓ 索引已存在\n');
        }
      }

      // 5. 验证结果
      console.log('5️⃣  验证迁移结果...');
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE knowledge_extracted = TRUE) as extracted,
          COUNT(*) FILTER (WHERE knowledge_extracted = FALSE) as not_extracted
        FROM source_items
      `);
      const { total, extracted, not_extracted } = stats.rows[0];
      console.log(`   ✓ 总计: ${total} 个文档`);
      console.log(`   ✓ 已提取: ${extracted} 个文档`);
      console.log(`   ✓ 未提取: ${not_extracted} 个文档\n`);

      console.log('='.repeat(50));
      console.log('✅ PostgreSQL 数据库迁移完成！');
      console.log('='.repeat(50));

      await pool.end();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ PostgreSQL 迁移失败:', error.message);
      console.error('\n错误详情:', error);
      await pool.end();
      process.exit(1);
    }
  }

  migratePostgreSQL();
} else {
  // 使用SQLite迁移
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const fs = require('fs');

  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/knowledge.db');

  if (!fs.existsSync(dbPath)) {
    console.error('❌ 数据库文件不存在:', dbPath);
    console.log('💡 提示: 请先运行 npm run init-db 初始化数据库');
    process.exit(1);
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ 数据库连接失败:', err.message);
      process.exit(1);
    }
    console.log('✓ 已连接到SQLite数据库\n');
  });

  async function migrateSQLite() {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        console.log('🔧 开始为 SQLite 数据库添加 knowledge_extracted 字段...\n');

        // 1. 检查字段是否存在
        console.log('1️⃣  检查 knowledge_extracted 字段是否存在...');
        db.get("PRAGMA table_info(source_items)", (err, rows) => {
          if (err) {
            console.error('❌ 检查表结构失败:', err.message);
            return reject(err);
          }

          db.all("PRAGMA table_info(source_items)", (err, columns) => {
            if (err) {
              console.error('❌ 获取表结构失败:', err.message);
              return reject(err);
            }

            const hasField = columns.some(col => col.name === 'knowledge_extracted');

            if (hasField) {
              console.log('   ✓ knowledge_extracted 字段已存在，跳过添加\n');
              initExistingData();
            } else {
              // 2. 添加字段
              console.log('2️⃣  添加 knowledge_extracted 字段...');
              db.run(`
                ALTER TABLE source_items 
                ADD COLUMN knowledge_extracted INTEGER DEFAULT 0
              `, (err) => {
                if (err) {
                  console.error('❌ 添加字段失败:', err.message);
                  return reject(err);
                }
                console.log('   ✓ knowledge_extracted 字段已添加\n');
                initExistingData();
              });
            }
          });
        });

        function initExistingData() {
          // 3. 初始化现有数据
          console.log('3️⃣  初始化现有数据...');
          db.run(`
            UPDATE source_items
            SET knowledge_extracted = 1
            WHERE id IN (
              SELECT DISTINCT source_item_id 
              FROM personal_knowledge_items 
              WHERE source_item_id IS NOT NULL
            )
            AND (knowledge_extracted IS NULL OR knowledge_extracted = 0)
          `, function(err) {
            if (err) {
              console.error('❌ 初始化数据失败:', err.message);
              return reject(err);
            }
            console.log(`   ✓ 已将 ${this.changes} 个已有知识点的文档标记为已提取\n`);

            // 4. 创建索引
            console.log('4️⃣  创建索引...');
            db.run(`
              CREATE INDEX IF NOT EXISTS idx_source_items_knowledge_extracted 
              ON source_items(knowledge_extracted)
            `, (err) => {
              if (err) {
                console.warn('   ⚠️  创建索引时出现警告:', err.message);
              } else {
                console.log('   ✓ 索引已创建\n');
              }

              // 5. 验证结果
              console.log('5️⃣  验证迁移结果...');
              db.get(`
                SELECT 
                  COUNT(*) as total,
                  SUM(CASE WHEN knowledge_extracted = 1 THEN 1 ELSE 0 END) as extracted,
                  SUM(CASE WHEN knowledge_extracted = 0 THEN 1 ELSE 0 END) as not_extracted
                FROM source_items
              `, (err, stats) => {
                if (err) {
                  console.error('❌ 验证失败:', err.message);
                  return reject(err);
                }

                console.log(`   ✓ 总计: ${stats.total} 个文档`);
                console.log(`   ✓ 已提取: ${stats.extracted || 0} 个文档`);
                console.log(`   ✓ 未提取: ${stats.not_extracted || 0} 个文档\n`);

                console.log('='.repeat(50));
                console.log('✅ SQLite 数据库迁移完成！');
                console.log('='.repeat(50));

                db.close((err) => {
                  if (err) {
                    console.error('关闭数据库连接失败:', err.message);
                    return reject(err);
                  }
                  resolve();
                });
              });
            });
          });
        }
      });
    });
  }

  migrateSQLite()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ SQLite 迁移失败:', error);
      db.close();
      process.exit(1);
    });
}

