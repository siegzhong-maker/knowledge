#!/usr/bin/env node

/**
 * SQLite 到 PostgreSQL 数据迁移脚本
 * 
 * 用法：
 *   1. 设置 DATABASE_URL 环境变量指向目标 PostgreSQL 数据库
 *   2. 运行: node backend/scripts/migrate-sqlite-to-pg.js
 * 
 * 示例：
 *   DATABASE_URL="postgresql://user:pass@host:5432/db" node backend/scripts/migrate-sqlite-to-pg.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPg = require('../services/db-pg');

// SQLite 数据库路径
const sqlitePath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/knowledge.db');

// 检查 SQLite 数据库文件是否存在
if (!fs.existsSync(sqlitePath)) {
  console.error(`错误: SQLite 数据库文件不存在: ${sqlitePath}`);
  process.exit(1);
}

// 检查 DATABASE_URL 环境变量
if (!process.env.DATABASE_URL) {
  console.error('错误: 未设置 DATABASE_URL 环境变量');
  console.error('请设置 DATABASE_URL 指向目标 PostgreSQL 数据库');
  process.exit(1);
}

async function migrate() {
  let sqliteDb = null;
  let pgPool = null;

  try {
    console.log('开始数据迁移...\n');
    console.log(`SQLite 数据库: ${sqlitePath}`);
    console.log(`PostgreSQL 数据库: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

    // 连接 SQLite 数据库
    console.log('1. 连接 SQLite 数据库...');
    sqliteDb = await new Promise((resolve, reject) => {
      const db = new sqlite3.Database(sqlitePath, (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });
    console.log('✓ SQLite 数据库连接成功\n');

    // 连接 PostgreSQL 数据库
    console.log('2. 连接 PostgreSQL 数据库...');
    await dbPg.connect();
    pgPool = dbPg.pool;
    console.log('✓ PostgreSQL 数据库连接成功\n');

    // 迁移数据
    console.log('3. 开始迁移数据...\n');

    // 3.1 迁移 knowledge_bases 表（如果存在）
    await migrateTable(sqliteDb, pgPool, 'knowledge_bases', [
      'id', 'name', 'description', 'icon', 'color', 'is_default', 'created_at', 'updated_at'
    ]);

    // 3.2 迁移 modules 表（如果存在）
    await migrateTable(sqliteDb, pgPool, 'modules', [
      'id', 'knowledge_base_id', 'step_number', 'step_name', 'checkpoint_number', 
      'checkpoint_name', 'description', 'order_index', 'created_at'
    ]);

    // 3.3 迁移 source_items 表
    await migrateTable(sqliteDb, pgPool, 'source_items', [
      'id', 'type', 'title', 'raw_content', 'original_url', 'summary_ai', 'source',
      'tags', 'file_path', 'page_count', 'page_content', 'created_at', 'updated_at',
      'status', 'knowledge_base_id', 'module_id'
    ]);

    // 3.4 迁移 tags 表
    // tags 表在 PostgreSQL 中使用 SERIAL id，但 name 是 UNIQUE
    // 使用 name 作为唯一键来避免重复，id 会自动生成
    await migrateTable(sqliteDb, pgPool, 'tags', [
      'name', 'color', 'count', 'created_at'
    ], 'name'); // tags 表使用 name 作为唯一标识（name 是 UNIQUE）

    // 3.5 迁移 settings 表
    await migrateTable(sqliteDb, pgPool, 'settings', [
      'key', 'value'
    ], 'key'); // settings 表使用 key 作为唯一标识

    // 3.6 迁移 user_contexts 表
    await migrateTable(sqliteDb, pgPool, 'user_contexts', [
      'id', 'name', 'context_data', 'is_active', 'created_at'
    ]);

    console.log('\n✓ 数据迁移完成！');
    console.log('\n迁移统计：');
    console.log(`- knowledge_bases: ${await getTableCount(pgPool, 'knowledge_bases')} 条记录`);
    console.log(`- modules: ${await getTableCount(pgPool, 'modules')} 条记录`);
    console.log(`- source_items: ${await getTableCount(pgPool, 'source_items')} 条记录`);
    console.log(`- tags: ${await getTableCount(pgPool, 'tags')} 条记录`);
    console.log(`- settings: ${await getTableCount(pgPool, 'settings')} 条记录`);
    console.log(`- user_contexts: ${await getTableCount(pgPool, 'user_contexts')} 条记录`);

  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    // 关闭连接
    if (sqliteDb) {
      sqliteDb.close();
    }
    if (pgPool) {
      await dbPg.close();
    }
  }
}

/**
 * 迁移单个表的数据
 */
function migrateTable(sqliteDb, pgPool, tableName, columns, uniqueKey = null) {
  return new Promise((resolve, reject) => {
    // 检查表是否存在
    sqliteDb.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], async (err, row) => {
      if (err) {
        return reject(err);
      }

      if (!row) {
        console.log(`⏭  跳过 ${tableName} 表（SQLite 中不存在）`);
        return resolve();
      }

      try {
        // 读取 SQLite 数据
        const sqliteData = await new Promise((resolve, reject) => {
          sqliteDb.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });

        if (sqliteData.length === 0) {
          console.log(`⏭  跳过 ${tableName} 表（无数据）`);
          return resolve();
        }

        console.log(`📦 迁移 ${tableName} 表（${sqliteData.length} 条记录）...`);

        // 批量插入到 PostgreSQL
        let migrated = 0;
        for (const row of sqliteData) {
          try {
            // 构建 INSERT 语句
            const values = columns.map(col => {
              const value = row[col];
              // 处理 NULL 值
              if (value === null || value === undefined) {
                return null;
              }
              // 处理布尔值（SQLite 使用 INTEGER，PostgreSQL 使用 BOOLEAN）
              if (col === 'is_active' || col === 'is_default') {
                return value === 1 || value === true;
              }
              return value;
            });

            // 如果指定了唯一键，使用 INSERT ... ON CONFLICT 处理重复
            if (uniqueKey) {
              const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
              const updateColumns = columns.filter(col => col !== uniqueKey).map(col => `${col} = EXCLUDED.${col}`);
              const sql = `
                INSERT INTO ${tableName} (${columns.join(', ')}) 
                VALUES (${placeholders})
                ON CONFLICT (${uniqueKey}) DO UPDATE SET ${updateColumns.join(', ')}
              `;
              await pgPool.query(sql, values);
            } else {
              const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
              const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
              await pgPool.query(sql, values);
            }
            migrated++;
          } catch (insertError) {
            // 如果是重复键错误，跳过
            if (insertError.code === '23505') {
              console.warn(`  ⚠  跳过重复记录: ${tableName} (${uniqueKey ? row[uniqueKey] : row.id})`);
            } else {
              console.error(`  ❌ 插入记录失败:`, insertError.message);
              throw insertError;
            }
          }
        }

        console.log(`  ✓ ${tableName} 表迁移完成（${migrated}/${sqliteData.length} 条记录）`);
        resolve();
      } catch (error) {
        console.error(`  ❌ ${tableName} 表迁移失败:`, error.message);
        reject(error);
      }
    });
  });
}

/**
 * 获取表的记录数
 */
async function getTableCount(pgPool, tableName) {
  try {
    const result = await pgPool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return result.rows[0]?.count || 0;
  } catch (error) {
    return 0;
  }
}

// 运行迁移
migrate().catch(error => {
  console.error('迁移失败:', error);
  process.exit(1);
});

