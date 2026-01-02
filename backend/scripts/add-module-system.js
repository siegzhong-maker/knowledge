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

// 6步18关的数据定义
const modules = [
  // 第一步：选方向（4个关卡）
  { step: 1, stepName: '选方向', checkpoint: 1, checkpointName: '找风口', description: '寻找市场趋势和机会', orderIndex: 1 },
  { step: 1, stepName: '选方向', checkpoint: 2, checkpointName: '寻初心', description: '明确创业初心和使命', orderIndex: 2 },
  { step: 1, stepName: '选方向', checkpoint: 3, checkpointName: '知优势', description: '识别自身优势和资源', orderIndex: 3 },
  { step: 1, stepName: '选方向', checkpoint: 4, checkpointName: '搭班子', description: '组建核心团队', orderIndex: 4 },
  
  // 第二步：找合伙人（1个关卡，但为了统一，我们设为关卡1）
  { step: 2, stepName: '找合伙人', checkpoint: 1, checkpointName: '找合伙人', description: '寻找合适的合伙人', orderIndex: 5 },
  
  // 第三步：找用户（3个关卡）
  { step: 3, stepName: '找用户', checkpoint: 1, checkpointName: '清晰画像', description: '明确目标用户画像', orderIndex: 6 },
  { step: 3, stepName: '找用户', checkpoint: 2, checkpointName: '找准痛点', description: '识别用户真实痛点', orderIndex: 7 },
  { step: 3, stepName: '找用户', checkpoint: 3, checkpointName: '选准差异', description: '确定差异化定位', orderIndex: 8 },
  
  // 第四步：创产品（3个关卡）
  { step: 4, stepName: '创产品', checkpoint: 1, checkpointName: '创造价值', description: '创造核心用户价值', orderIndex: 9 },
  { step: 4, stepName: '创产品', checkpoint: 2, checkpointName: '独特价值', description: '打造独特价值主张', orderIndex: 10 },
  { step: 4, stepName: '创产品', checkpoint: 3, checkpointName: '科学迭代', description: '建立科学迭代机制', orderIndex: 11 },
  
  // 第五步：营销1.0（3个关卡）
  { step: 5, stepName: '营销1.0', checkpoint: 1, checkpointName: '销售漏斗', description: '构建销售转化漏斗', orderIndex: 12 },
  { step: 5, stepName: '营销1.0', checkpoint: 2, checkpointName: '品类定位', description: '明确品类定位策略', orderIndex: 13 },
  { step: 5, stepName: '营销1.0', checkpoint: 3, checkpointName: '维系罗盘', description: '建立客户维系体系', orderIndex: 14 },
  
  // 第六步：商业模式1.0（3个关卡）
  { step: 6, stepName: '商业模式1.0', checkpoint: 1, checkpointName: '盈利模式', description: '设计可持续盈利模式', orderIndex: 15 },
  { step: 6, stepName: '商业模式1.0', checkpoint: 2, checkpointName: '核心壁垒', description: '构建核心竞争壁垒', orderIndex: 16 },
  { step: 6, stepName: '商业模式1.0', checkpoint: 3, checkpointName: '清晰式样', description: '明确商业模式样式', orderIndex: 17 },
];

db.serialize(() => {
  // 1. 创建模块表
  db.run(`
    CREATE TABLE IF NOT EXISTS entrepreneurship_modules (
      id TEXT PRIMARY KEY,
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
      console.error('创建模块表失败:', err.message);
    } else {
      console.log('✓ entrepreneurship_modules表已创建');
    }
  });

  // 2. 添加metadata列到source_items表
  db.run(`ALTER TABLE source_items ADD COLUMN metadata TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('添加metadata字段失败:', err.message);
    } else {
      console.log('✓ source_items表已添加metadata列');
    }
  });

  // 3. 添加module_id列到source_items表
  db.run(`ALTER TABLE source_items ADD COLUMN module_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('添加module_id字段失败:', err.message);
    } else {
      console.log('✓ source_items表已添加module_id列');
    }
  });

  // 4. 初始化模块数据
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO entrepreneurship_modules 
    (id, step_number, step_name, checkpoint_number, checkpoint_name, description, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  modules.forEach((module, index) => {
    const moduleId = `step${module.step}-checkpoint${module.checkpoint}`;
    stmt.run(
      moduleId,
      module.step,
      module.stepName,
      module.checkpoint,
      module.checkpointName,
      module.description,
      module.orderIndex,
      Date.now()
    );
  });

  stmt.finalize((err) => {
    if (err) {
      console.error('初始化模块数据失败:', err.message);
    } else {
      console.log(`✓ 已初始化 ${modules.length} 个模块数据`);
    }
    
    // 关闭数据库连接
    db.close((err) => {
      if (err) {
        console.error('关闭数据库失败:', err.message);
      } else {
        console.log('数据库迁移完成');
      }
      process.exit(0);
    });
  });
});

