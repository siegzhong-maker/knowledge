const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 支持环境变量配置数据库路径
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/knowledge.db');

if (!fs.existsSync(dbPath)) {
  console.log('数据库文件不存在，无需迁移');
  process.exit(0);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('已连接到SQLite数据库');
});

// 迁移：更新source_items表支持PDF类型
db.serialize(() => {
  // 1. 检查表是否存在
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='source_items'", (err, row) => {
    if (err) {
      console.error('检查表失败:', err.message);
      db.close();
      process.exit(1);
    }

    if (!row) {
      console.log('source_items表不存在，无需迁移');
      db.close();
      process.exit(0);
    }

    // 2. 检查是否已经支持pdf类型（检查表结构）
    db.all("PRAGMA table_info(source_items)", (err, columns) => {
      if (err) {
        console.error('获取表结构失败:', err.message);
        db.close();
        process.exit(1);
      }

      // 检查是否有file_path字段（新字段）
      const hasNewFields = columns.some(col => col.name === 'file_path');
      
      if (hasNewFields) {
        console.log('表结构已更新，检查CHECK约束...');
        
        // 检查CHECK约束（通过尝试插入pdf类型来测试）
        db.run("INSERT INTO source_items (id, type, title, created_at, updated_at) VALUES ('test-migration', 'pdf', 'test', ?, ?)", 
          [Date.now(), Date.now()], 
          function(err) {
            if (err && err.message.includes('CHECK constraint')) {
              console.log('需要更新CHECK约束，开始迁移...');
              migrateTable();
            } else {
              if (err) {
                // 删除测试数据
                db.run("DELETE FROM source_items WHERE id = 'test-migration'");
              }
              console.log('✓ CHECK约束已支持pdf类型，无需迁移');
              db.close();
              process.exit(0);
            }
          }
        );
      } else {
        console.log('开始迁移表结构...');
        migrateTable();
      }
    });
  });
});

function migrateTable() {
  console.log('开始迁移source_items表...');
  
  // 1. 备份现有数据
  db.all("SELECT * FROM source_items", (err, rows) => {
    if (err) {
      console.error('备份数据失败:', err.message);
      db.close();
      process.exit(1);
    }

    console.log(`备份了 ${rows.length} 条记录`);

    // 2. 创建新表
    db.run(`
      CREATE TABLE source_items_new (
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
        console.error('创建新表失败:', err.message);
        db.close();
        process.exit(1);
      }

      console.log('✓ 新表创建成功');

      // 3. 迁移数据
      const stmt = db.prepare(`
        INSERT INTO source_items_new 
        (id, type, title, raw_content, original_url, summary_ai, source, tags, 
         file_path, page_count, page_content, created_at, updated_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let migrated = 0;
      rows.forEach((row) => {
        stmt.run(
          row.id,
          row.type,
          row.title,
          row.raw_content || null,
          row.original_url || null,
          row.summary_ai || null,
          row.source || null,
          row.tags || '[]',
          row.file_path || null,
          row.page_count || null,
          row.page_content || null,
          row.created_at,
          row.updated_at,
          row.status || 'pending',
          (err) => {
            if (err) {
              console.error(`迁移记录 ${row.id} 失败:`, err.message);
            } else {
              migrated++;
            }
          }
        );
      });

      stmt.finalize((err) => {
        if (err) {
          console.error('完成数据迁移失败:', err.message);
          db.close();
          process.exit(1);
        }

        console.log(`✓ 成功迁移 ${migrated} 条记录`);

        // 4. 删除旧表
        db.run("DROP TABLE source_items", (err) => {
          if (err) {
            console.error('删除旧表失败:', err.message);
            db.close();
            process.exit(1);
          }

          console.log('✓ 旧表已删除');

          // 5. 重命名新表
          db.run("ALTER TABLE source_items_new RENAME TO source_items", (err) => {
            if (err) {
              console.error('重命名表失败:', err.message);
              db.close();
              process.exit(1);
            }

            console.log('✓ 表重命名成功');

            // 6. 重新创建索引
            db.run(`CREATE INDEX IF NOT EXISTS idx_items_type ON source_items(type)`, (err) => {
              if (err) console.error('创建索引失败:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_items_status ON source_items(status)`, (err) => {
              if (err) console.error('创建索引失败:', err.message);
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_items_created_at ON source_items(created_at DESC)`, (err) => {
              if (err) {
                console.error('创建索引失败:', err.message);
              } else {
                console.log('✓ 索引重建完成');
                console.log('✓ 数据库迁移完成！');
                db.close();
                process.exit(0);
              }
            });
          });
        });
      });
    });
  });
}

