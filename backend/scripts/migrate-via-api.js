#!/usr/bin/env node

/**
 * 通过 HTTP API 迁移 SQLite 数据到 PostgreSQL
 * 
 * 用法：
 *   API_URL="https://your-app.up.railway.app" node backend/scripts/migrate-via-api.js
 * 
 * 或本地测试：
 *   API_URL="http://localhost:3000" node backend/scripts/migrate-via-api.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// SQLite 数据库路径
const sqlitePath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/knowledge.db');
const apiUrl = process.env.API_URL || 'http://localhost:3000';

// 检查 SQLite 数据库文件是否存在
if (!fs.existsSync(sqlitePath)) {
  console.error(`错误: SQLite 数据库文件不存在: ${sqlitePath}`);
  process.exit(1);
}

if (!apiUrl) {
  console.error('错误: 未设置 API_URL 环境变量');
  console.error('请设置 API_URL 指向你的 Railway 应用 URL');
  console.error('示例: API_URL="https://your-app.up.railway.app" node backend/scripts/migrate-via-api.js');
  process.exit(1);
}

// HTTP 请求函数
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = httpModule.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.message || responseData}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// 从 SQLite 读取数据
function readTableData(db, tableName) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
      if (err) {
        // 表可能不存在，返回空数组
        if (err.message.includes('no such table')) {
          resolve([]);
        } else {
          reject(err);
        }
      } else {
        resolve(rows || []);
      }
    });
  });
}

async function migrate() {
  let sqliteDb = null;

  try {
    console.log('开始通过 API 迁移数据...\n');
    console.log(`SQLite 数据库: ${sqlitePath}`);
    console.log(`API 地址: ${apiUrl}\n`);

    // 连接 SQLite 数据库
    console.log('1. 连接 SQLite 数据库...');
    sqliteDb = await new Promise((resolve, reject) => {
      const db = new sqlite3.Database(sqlitePath, (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });
    console.log('✓ SQLite 数据库连接成功\n');

    // 读取所有表的数据
    console.log('2. 读取 SQLite 数据...');
    
    const knowledge_bases = await readTableData(sqliteDb, 'knowledge_bases');
    const modules = await readTableData(sqliteDb, 'modules');
    const source_items = await readTableData(sqliteDb, 'source_items');
    const tags = await readTableData(sqliteDb, 'tags');
    const settings = await readTableData(sqliteDb, 'settings');
    const user_contexts = await readTableData(sqliteDb, 'user_contexts');

    console.log(`  - knowledge_bases: ${knowledge_bases.length} 条记录`);
    console.log(`  - modules: ${modules.length} 条记录`);
    console.log(`  - source_items: ${source_items.length} 条记录`);
    console.log(`  - tags: ${tags.length} 条记录`);
    console.log(`  - settings: ${settings.length} 条记录`);
    console.log(`  - user_contexts: ${user_contexts.length} 条记录`);
    console.log('✓ 数据读取完成\n');

    // 准备迁移数据
    const totalRecords = knowledge_bases.length + modules.length + source_items.length + 
                         tags.length + settings.length + user_contexts.length;
    
    if (totalRecords === 0) {
      console.log('⚠️  没有数据需要迁移');
      return;
    }

    // 通过 API 上传数据
    console.log('3. 通过 API 上传数据到 PostgreSQL...');
    const migrateData = {
      knowledge_bases,
      modules,
      source_items,
      tags,
      settings,
      user_contexts
    };

    const result = await makeRequest(`${apiUrl}/api/migrate/upload`, migrateData);
    
    console.log('\n✓ 数据迁移完成！');
    console.log('\n迁移统计：');
    console.log(`- knowledge_bases: ${result.stats.knowledge_bases} 条记录`);
    console.log(`- modules: ${result.stats.modules} 条记录`);
    console.log(`- source_items: ${result.stats.source_items} 条记录`);
    console.log(`- tags: ${result.stats.tags} 条记录`);
    console.log(`- settings: ${result.stats.settings} 条记录`);
    console.log(`- user_contexts: ${result.stats.user_contexts} 条记录`);

  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('\n提示: 无法连接到 API 服务器');
      console.error('请检查:');
      console.error('1. API_URL 是否正确');
      console.error('2. Railway 应用是否正在运行');
      console.error('3. 网络连接是否正常');
    }
    process.exit(1);
  } finally {
    // 关闭 SQLite 连接
    if (sqliteDb) {
      sqliteDb.close();
    }
  }
}

// 运行迁移
migrate().catch(error => {
  console.error('迁移失败:', error);
  process.exit(1);
});

