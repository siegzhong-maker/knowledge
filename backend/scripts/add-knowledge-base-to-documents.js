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
  
  // 1. 添加knowledge_base_id字段到source_items表
  db.run(`ALTER TABLE source_items ADD COLUMN knowledge_base_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('添加knowledge_base_id字段失败:', err.message);
      process.exit(1);
    } else {
      console.log('✓ source_items表已添加knowledge_base_id列');
    }
  });

  // 2. 为现有文档设置默认知识库ID
  // 策略：如果文档有module_id，则根据module_id推断知识库
  // 否则统一设置为默认知识库
  
  // 先获取所有有module_id的文档，并查找对应的知识库
  db.all(`
    SELECT DISTINCT module_id 
    FROM source_items 
    WHERE module_id IS NOT NULL AND module_id != ''
  `, (err, rows) => {
    if (err) {
      console.error('查询文档module_id失败:', err.message);
      process.exit(1);
    }

    // 检查modules表，获取module_id对应的knowledge_base_id
    if (rows.length > 0) {
      const moduleIds = rows.map(r => r.module_id).filter(Boolean);
      const placeholders = moduleIds.map(() => '?').join(',');
      
      db.all(`
        SELECT id, knowledge_base_id 
        FROM modules 
        WHERE id IN (${placeholders})
      `, moduleIds, (err, moduleKbMap) => {
        if (err) {
          console.error('查询模块知识库映射失败:', err.message);
          process.exit(1);
        }

        // 创建映射
        const kbMap = {};
        moduleKbMap.forEach(m => {
          kbMap[m.id] = m.knowledge_base_id;
        });

        // 更新文档的knowledge_base_id
        let updated = 0;
        let total = 0;

        moduleIds.forEach(moduleId => {
          const kbId = kbMap[moduleId] || defaultKbId;
          
          db.run(`
            UPDATE source_items 
            SET knowledge_base_id = ? 
            WHERE module_id = ? AND (knowledge_base_id IS NULL OR knowledge_base_id = '')
          `, [kbId, moduleId], function(err) {
            if (err) {
              console.error(`更新文档失败 (module_id: ${moduleId}):`, err.message);
            } else {
              updated += this.changes;
            }
            total++;
            
            if (total === moduleIds.length) {
              // 更新没有module_id的文档
              db.run(`
                UPDATE source_items 
                SET knowledge_base_id = ? 
                WHERE (knowledge_base_id IS NULL OR knowledge_base_id = '')
              `, [defaultKbId], function(err) {
                if (err) {
                  console.error('更新无模块文档失败:', err.message);
                } else {
                  console.log(`✓ 已更新 ${updated + this.changes} 个文档的knowledge_base_id`);
                }
                
                finishMigration();
              });
            }
          });
        });

        if (moduleIds.length === 0) {
          // 没有module_id的文档，统一设置为默认知识库
          db.run(`
            UPDATE source_items 
            SET knowledge_base_id = ? 
            WHERE (knowledge_base_id IS NULL OR knowledge_base_id = '')
          `, [defaultKbId], function(err) {
            if (err) {
              console.error('更新文档失败:', err.message);
            } else {
              console.log(`✓ 已更新 ${this.changes} 个文档的knowledge_base_id`);
            }
            finishMigration();
          });
        }
      });
    } else {
      // 所有文档都没有module_id，统一设置为默认知识库
      db.run(`
        UPDATE source_items 
        SET knowledge_base_id = ? 
        WHERE (knowledge_base_id IS NULL OR knowledge_base_id = '')
      `, [defaultKbId], function(err) {
        if (err) {
          console.error('更新文档失败:', err.message);
        } else {
          console.log(`✓ 已更新 ${this.changes} 个文档的knowledge_base_id`);
        }
        finishMigration();
      });
    }
  });

  function finishMigration() {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
      } else {
        console.log('文档表迁移完成');
      }
      process.exit(0);
    });
  }
});

