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
  const defaultKbId = 'kb-entrepreneurship';
  
  // 1. 创建新的modules表（包含knowledge_base_id）
  db.run(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      knowledge_base_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      step_name TEXT NOT NULL,
      checkpoint_number INTEGER,
      checkpoint_name TEXT,
      description TEXT,
      order_index INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('创建modules表失败:', err.message);
      process.exit(1);
    } else {
      console.log('✓ modules表已创建');
    }
  });

  // 2. 检查是否存在旧的entrepreneurship_modules表
  db.get(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='entrepreneurship_modules'
  `, (err, row) => {
    if (err) {
      console.error('检查旧表失败:', err.message);
      process.exit(1);
    }

    if (row) {
      // 3. 迁移数据从entrepreneurship_modules到modules
      db.all('SELECT * FROM entrepreneurship_modules ORDER BY order_index ASC', (err, modules) => {
        if (err) {
          console.error('读取旧模块数据失败:', err.message);
          process.exit(1);
        }

        if (modules.length === 0) {
          console.log('没有需要迁移的模块数据');
          finishMigration();
          return;
        }

        const stmt = db.prepare(`
          INSERT OR REPLACE INTO modules 
          (id, knowledge_base_id, step_number, step_name, checkpoint_number, checkpoint_name, description, order_index, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let migrated = 0;
        modules.forEach((module) => {
          stmt.run(
            module.id,
            defaultKbId, // 所有现有模块归属到默认知识库
            module.step_number,
            module.step_name,
            module.checkpoint_number,
            module.checkpoint_name,
            module.description,
            module.order_index,
            module.created_at || Date.now()
          );
          migrated++;
        });

        stmt.finalize((err) => {
          if (err) {
            console.error('迁移模块数据失败:', err.message);
            process.exit(1);
          } else {
            console.log(`✓ 已迁移 ${migrated} 个模块到modules表`);
            finishMigration();
          }
        });
      });
    } else {
      console.log('未找到entrepreneurship_modules表，跳过迁移');
      finishMigration();
    }
  });

  function finishMigration() {
    // 4. 可选：重命名旧表（保留备份）
    // db.run('ALTER TABLE entrepreneurship_modules RENAME TO entrepreneurship_modules_backup', (err) => {
    //   if (err && !err.message.includes('no such table')) {
    //     console.warn('重命名旧表失败（可忽略）:', err.message);
    //   }
    // });

    db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
      } else {
        console.log('模块表迁移完成');
      }
      process.exit(0);
    });
  }
});

