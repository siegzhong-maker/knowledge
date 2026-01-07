/**
 * 修复PDF文件路径
 * 将数据库中的绝对路径转换为相对路径（仅文件名）
 */

const db = require('../services/db');
const path = require('path');

async function fixPDFPaths() {
  try {
    console.log('开始修复PDF文件路径...\n');
    
    // 获取所有PDF记录
    const pdfItems = await db.all(
      'SELECT id, title, file_path FROM source_items WHERE type = ?',
      ['pdf']
    );
    
    console.log(`找到 ${pdfItems.length} 个PDF记录\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    const fixedItems = [];
    
    for (const item of pdfItems) {
      if (!item.file_path) {
        skippedCount++;
        continue;
      }
      
      // 检查是否是绝对路径
      if (path.isAbsolute(item.file_path)) {
        // 提取文件名
        const fileName = path.basename(item.file_path);
        
        console.log(`修复: ${item.title}`);
        console.log(`  原路径: ${item.file_path}`);
        console.log(`  新路径: ${fileName}`);
        
        // 更新数据库
        await db.run(
          'UPDATE source_items SET file_path = ? WHERE id = ?',
          [fileName, item.id]
        );
        
        fixedItems.push({
          id: item.id,
          title: item.title,
          oldPath: item.file_path,
          newPath: fileName
        });
        
        fixedCount++;
        console.log(`  ✓ 已修复\n`);
      } else {
        skippedCount++;
      }
    }
    
    // 输出结果
    console.log('='.repeat(60));
    console.log('修复完成');
    console.log('='.repeat(60));
    console.log(`✓ 已修复: ${fixedCount} 个`);
    console.log(`- 跳过: ${skippedCount} 个（已经是相对路径）\n`);
    
    if (fixedCount > 0) {
      console.log('修复的记录:');
      fixedItems.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.title}`);
        console.log(`   ID: ${item.id}`);
        console.log(`   原路径: ${item.oldPath}`);
        console.log(`   新路径: ${item.newPath}`);
      });
    }
    
    return {
      total: pdfItems.length,
      fixed: fixedCount,
      skipped: skippedCount,
      fixedItems: fixedItems
    };
  } catch (error) {
    console.error('修复失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    try {
      await db.connect();
      const result = await fixPDFPaths();
      console.log('\n修复完成！');
      process.exit(0);
    } catch (error) {
      console.error('脚本执行失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { fixPDFPaths };

