const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 支持环境变量配置数据库路径
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../database/knowledge.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('已连接到SQLite数据库');
});

// 修复PDF标题编码
db.serialize(() => {
  // 获取所有PDF类型的记录
  db.all("SELECT id, title FROM source_items WHERE type = 'pdf'", (err, rows) => {
    if (err) {
      console.error('查询失败:', err.message);
      db.close();
      process.exit(1);
    }

    if (rows.length === 0) {
      console.log('没有找到PDF记录');
      db.close();
      process.exit(0);
    }

    console.log(`找到 ${rows.length} 条PDF记录，开始修复...`);

    let fixed = 0;
    rows.forEach((row) => {
      let fixedTitle = row.title;
      
      // 尝试修复编码
      try {
        // 检查是否包含乱码字符（常见的中文乱码模式）
        if (/[^\x00-\x7F]/.test(row.title) && !/[\u4e00-\u9fa5]/.test(row.title)) {
          // 尝试从latin1恢复
          const decoded = Buffer.from(row.title, 'latin1').toString('utf-8');
          if (/[\u4e00-\u9fa5]/.test(decoded)) {
            fixedTitle = decoded;
            console.log(`修复: "${row.title}" -> "${fixedTitle}"`);
          }
        }
      } catch (e) {
        console.warn(`修复记录 ${row.id} 失败:`, e.message);
      }

      // 更新数据库
      if (fixedTitle !== row.title) {
        db.run(
          'UPDATE source_items SET title = ? WHERE id = ?',
          [fixedTitle, row.id],
          (err) => {
            if (err) {
              console.error(`更新记录 ${row.id} 失败:`, err.message);
            } else {
              fixed++;
            }
          }
        );
      }
    });

    // 等待所有更新完成
    setTimeout(() => {
      console.log(`✓ 成功修复 ${fixed} 条记录`);
      db.close();
      process.exit(0);
    }, 1000);
  });
});

