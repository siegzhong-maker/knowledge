#!/usr/bin/env node

/**
 * 完整数据迁移脚本：从本地 SQLite 迁移到云端 PostgreSQL
 * 
 * 功能：
 * - 迁移所有表的数据（包括 personal_knowledge_items）
 * - 自动处理数据类型转换（布尔值、JSON等）
 * - 支持幂等操作（可重复运行，不会重复插入）
 * 
 * 使用方法：
 *   1. 从 Railway Dashboard 获取 PostgreSQL 连接字符串
 *   2. 在本地运行：
 *      DATABASE_URL="postgresql://..." node backend/scripts/migrate-all-data.js
 * 
 * 或使用 npm 脚本：
 *   DATABASE_URL="postgresql://..." npm run migrate-to-pg
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPg = require('../services/db-pg');

// SQLite 数据库路径
const sqlitePath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/knowledge.db');

// 检查 SQLite 数据库文件是否存在
if (!fs.existsSync(sqlitePath)) {
  console.error(`❌ 错误: SQLite 数据库文件不存在: ${sqlitePath}`);
  console.error('提示: 请确认本地数据库文件路径是否正确');
  process.exit(1);
}

// 检查 DATABASE_URL 环境变量
if (!process.env.DATABASE_URL) {
  console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
  console.error('\n请按以下步骤操作：');
  console.error('1. 登录 Railway Dashboard: https://railway.app');
  console.error('2. 进入你的项目 → Postgres 服务');
  console.error('3. 点击 "Variables" 标签页');
  console.error('4. 复制 DATABASE_URL 的值');
  console.error('5. 在终端运行：');
  console.error('   DATABASE_URL="postgresql://..." node backend/scripts/migrate-all-data.js');
  console.error('\n或者使用 npm 脚本：');
  console.error('   DATABASE_URL="postgresql://..." npm run migrate-to-pg');
  process.exit(1);
}

// 迁移统计
const stats = {
  knowledge_bases: 0,
  modules: 0,
  source_items: 0,
  tags: 0,
  settings: 0,
  user_contexts: 0,
  personal_knowledge_items: 0,
  knowledge_relations: 0,
  category_subcategories: 0
};

async function migrate() {
  let sqliteDb = null;
  let pgPool = null;

  try {
    console.log('🚀 开始数据迁移...\n');
    console.log(`📁 SQLite 数据库: ${sqlitePath}`);
    const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
    console.log(`🗄️  PostgreSQL 数据库: ${maskedUrl}\n`);

    // 连接 SQLite 数据库
    console.log('1️⃣  连接 SQLite 数据库...');
    sqliteDb = await new Promise((resolve, reject) => {
      const db = new sqlite3.Database(sqlitePath, (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });
    console.log('   ✓ SQLite 数据库连接成功\n');

    // 连接 PostgreSQL 数据库
    console.log('2️⃣  连接 PostgreSQL 数据库...');
    await dbPg.connect();
    pgPool = dbPg.pool;
    console.log('   ✓ PostgreSQL 数据库连接成功\n');

    // 确保目标表存在（如果不存在则创建）
    console.log('3️⃣  检查并创建目标表...');
    await ensureTablesExist(pgPool);
    console.log('   ✓ 表结构检查完成\n');

    // 迁移数据
    console.log('4️⃣  开始迁移数据...\n');

    // 迁移各个表
    await migrateTable(sqliteDb, pgPool, 'knowledge_bases', [
      'id', 'name', 'description', 'icon', 'color', 'is_default', 'created_at', 'updated_at'
    ], null, 'id');

    await migrateTable(sqliteDb, pgPool, 'modules', [
      'id', 'knowledge_base_id', 'step_number', 'step_name', 'checkpoint_number', 
      'checkpoint_name', 'description', 'order_index', 'created_at'
    ], null, 'id');

    await migrateTable(sqliteDb, pgPool, 'source_items', [
      'id', 'type', 'title', 'raw_content', 'original_url', 'summary_ai', 'source',
      'tags', 'file_path', 'page_count', 'page_content', 'created_at', 'updated_at',
      'status', 'knowledge_base_id', 'module_id'
    ], null, 'id');

    await migrateTable(sqliteDb, pgPool, 'tags', [
      'name', 'color', 'count', 'created_at'
    ], 'name', 'name'); // tags 表使用 name 作为唯一键

    await migrateTable(sqliteDb, pgPool, 'settings', [
      'key', 'value'
    ], 'key', 'key'); // settings 表使用 key 作为唯一键

    await migrateTable(sqliteDb, pgPool, 'user_contexts', [
      'id', 'name', 'context_data', 'is_active', 'created_at'
    ], null, 'id');

    // 迁移知识点表（如果存在）
    await migrateTable(sqliteDb, pgPool, 'personal_knowledge_items', [
      'id', 'title', 'content', 'summary', 'key_conclusions', 'source_item_id',
      'source_page', 'source_excerpt', 'confidence_score', 'status', 'category',
      'subcategory_id', 'tags', 'knowledge_base_id', 'created_at', 'updated_at', 'metadata'
    ], null, 'id');

    // 迁移知识点关系表（如果存在）
    await migrateTable(sqliteDb, pgPool, 'knowledge_relations', [
      'id', 'source_knowledge_id', 'target_knowledge_id', 'relation_type',
      'similarity_score', 'created_at'
    ], null, 'id');

    // 迁移子分类表（如果存在）
    await migrateTable(sqliteDb, pgPool, 'category_subcategories', [
      'id', 'category', 'name', 'keywords', 'order_index', 'is_custom', 'created_at', 'updated_at'
    ], ['category', 'name'], 'id'); // 使用 (category, name) 作为唯一键

    // 显示迁移统计
    console.log('\n' + '='.repeat(50));
    console.log('✅ 数据迁移完成！\n');
    console.log('📊 迁移统计：');
    for (const [table, count] of Object.entries(stats)) {
      if (count > 0) {
        console.log(`   - ${table}: ${count} 条记录`);
      }
    }
    console.log('\n' + '='.repeat(50));
    console.log('\n💡 提示: 迁移完成后，请刷新 Railway 应用页面查看数据');

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error('\n错误详情:', error);
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
 * 确保目标表存在
 */
async function ensureTablesExist(pgPool) {
  // 这里不需要创建表，因为 Railway 部署时会自动创建
  // 但如果表不存在，会在这里报错，提示用户先运行数据库初始化
  try {
    await pgPool.query('SELECT 1 FROM source_items LIMIT 1');
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.error('   ❌ 错误: PostgreSQL 数据库表不存在');
      console.error('   请先在 Railway 上运行数据库初始化：');
      console.error('   1. 在 Railway Web 服务中打开终端');
      console.error('   2. 运行: npm run init-db');
      throw new Error('数据库表不存在，请先初始化数据库');
    }
    throw error;
  }
}

/**
 * 迁移单个表的数据
 */
function migrateTable(sqliteDb, pgPool, tableName, columns, uniqueKey = null, primaryKey = 'id') {
  return new Promise((resolve, reject) => {
    // 检查表是否存在
    sqliteDb.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName], async (err, row) => {
      if (err) {
        return reject(err);
      }

      if (!row) {
        console.log(`   ⏭️  跳过 ${tableName} 表（SQLite 中不存在）`);
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
          console.log(`   ⏭️  跳过 ${tableName} 表（无数据）`);
          return resolve();
        }

        console.log(`   📦 迁移 ${tableName} 表（${sqliteData.length} 条记录）...`);

        // 批量插入到 PostgreSQL
        let migrated = 0;
        let skipped = 0;
        
        for (const row of sqliteData) {
          try {
            // 构建 INSERT 语句的值
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
              
              // 处理 JSON 字符串（确保是有效的 JSON）
              if ((col === 'tags' || col === 'key_conclusions' || col === 'keywords' || col === 'metadata') && typeof value === 'string') {
                try {
                  JSON.parse(value); // 验证 JSON 格式
                  return value;
                } catch (e) {
                  // 如果不是有效 JSON，返回空数组/对象的 JSON 字符串
                  if (col === 'tags' || col === 'key_conclusions' || col === 'keywords') {
                    return '[]';
                  } else if (col === 'metadata') {
                    return '{}';
                  }
                  return value;
                }
              }
              
              return value;
            });

            // 如果指定了唯一键，使用 INSERT ... ON CONFLICT 处理重复
            if (uniqueKey) {
              const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
              
              // 处理复合唯一键
              if (Array.isArray(uniqueKey)) {
                const conflictColumns = uniqueKey.join(', ');
                const updateColumns = columns.filter(col => !uniqueKey.includes(col))
                  .map(col => `${col} = EXCLUDED.${col}`);
                const sql = `
                  INSERT INTO ${tableName} (${columns.join(', ')}) 
                  VALUES (${placeholders})
                  ON CONFLICT (${conflictColumns}) DO UPDATE SET ${updateColumns.join(', ')}
                `;
                await pgPool.query(sql, values);
              } else {
                const updateColumns = columns.filter(col => col !== uniqueKey)
                  .map(col => `${col} = EXCLUDED.${col}`);
                const sql = `
                  INSERT INTO ${tableName} (${columns.join(', ')}) 
                  VALUES (${placeholders})
                  ON CONFLICT (${uniqueKey}) DO UPDATE SET ${updateColumns.join(', ')}
                `;
                await pgPool.query(sql, values);
              }
            } else {
              // 使用主键检查重复
              const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
              const updateColumns = columns.filter(col => col !== primaryKey)
                .map(col => `${col} = EXCLUDED.${col}`);
              const sql = `
                INSERT INTO ${tableName} (${columns.join(', ')}) 
                VALUES (${placeholders})
                ON CONFLICT (${primaryKey}) DO UPDATE SET ${updateColumns.join(', ')}
              `;
              await pgPool.query(sql, values);
            }
            
            migrated++;
            
            // 显示进度（每 10 条记录显示一次）
            if (migrated % 10 === 0) {
              process.stdout.write(`    已迁移 ${migrated}/${sqliteData.length} 条...\r`);
            }
          } catch (insertError) {
            // 如果是重复键错误，跳过
            if (insertError.code === '23505') {
              skipped++;
            } else {
              console.error(`\n     ❌ 插入记录失败:`, insertError.message);
              console.error(`     记录 ID: ${row[primaryKey] || 'N/A'}`);
              // 继续处理下一条记录，不中断整个迁移
            }
          }
        }

        // 更新统计
        stats[tableName] = migrated;
        
        console.log(`     ✓ ${tableName} 表迁移完成（${migrated} 条成功${skipped > 0 ? `, ${skipped} 条跳过（重复）` : ''}）`);
        resolve();
      } catch (error) {
        console.error(`     ❌ ${tableName} 表迁移失败:`, error.message);
        reject(error);
      }
    });
  });
}

// 运行迁移
migrate().catch(error => {
  console.error('迁移失败:', error);
  process.exit(1);
});

