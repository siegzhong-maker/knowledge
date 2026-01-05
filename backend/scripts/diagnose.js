#!/usr/bin/env node
/**
 * 诊断脚本：检查数据库和文件存储状态
 * 用于排查文件丢失问题
 */

const db = require('../services/db-pg');
const fs = require('fs').promises;
const path = require('path');

async function diagnose() {
  console.log('=== 系统诊断开始 ===\n');
  
  try {
    // 1. 检查数据库连接
    console.log('1. 检查数据库连接...');
    try {
      await db.connect();
      const client = db.pool;
      
      // 检查数据库连接信息
      const connectionString = process.env.DATABASE_URL;
      if (connectionString) {
        const url = new URL(connectionString);
        const dbName = url.pathname.replace('/', '') || 'unknown';
        console.log(`   ✓ 数据库连接成功`);
        console.log(`   - 数据库名称: ${dbName}`);
        console.log(`   - 主机: ${url.hostname}`);
        console.log(`   - 端口: ${url.port || '5432'}`);
      } else {
        console.log('   ⚠️  DATABASE_URL 未设置');
      }
      
      // 检查表是否存在
      console.log('\n2. 检查数据库表...');
      const tables = ['source_items', 'tags', 'settings', 'knowledge_bases', 'modules'];
      for (const table of tables) {
        try {
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = $1
            )
          `, [table]);
          const exists = result.rows[0]?.exists;
          if (exists) {
            // 检查记录数
            const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
            const count = parseInt(countResult.rows[0]?.count || 0);
            console.log(`   ✓ ${table}: 存在 (${count} 条记录)`);
          } else {
            console.log(`   ✗ ${table}: 不存在`);
          }
        } catch (err) {
          console.log(`   ✗ ${table}: 检查失败 - ${err.message}`);
        }
      }
      
      // 检查source_items中的文件记录
      console.log('\n3. 检查文件记录...');
      try {
        const pdfResult = await client.query(`
          SELECT COUNT(*) as count, 
                 COUNT(CASE WHEN file_path IS NOT NULL AND file_path != '' THEN 1 END) as with_file_path
          FROM source_items 
          WHERE type = 'pdf'
        `);
        const pdfCount = parseInt(pdfResult.rows[0]?.count || 0);
        const withFilePath = parseInt(pdfResult.rows[0]?.with_file_path || 0);
        console.log(`   - PDF记录总数: ${pdfCount}`);
        console.log(`   - 有文件路径的记录: ${withFilePath}`);
        
        if (pdfCount > 0 && withFilePath > 0) {
          // 显示一些示例文件路径
          const sampleResult = await client.query(`
            SELECT id, title, file_path 
            FROM source_items 
            WHERE type = 'pdf' AND file_path IS NOT NULL AND file_path != ''
            LIMIT 5
          `);
          console.log(`   - 示例文件路径:`);
          sampleResult.rows.forEach(row => {
            console.log(`     * ${row.title}: ${row.file_path}`);
          });
        }
      } catch (err) {
        console.log(`   ✗ 检查文件记录失败: ${err.message}`);
      }
      
      await db.close();
    } catch (err) {
      console.log(`   ✗ 数据库连接失败: ${err.message}`);
    }
    
    // 4. 检查文件存储目录
    console.log('\n4. 检查文件存储目录...');
    const uploadsDir = process.env.UPLOADS_PATH || 
                       (process.env.NODE_ENV === 'production' ? '/data/uploads' : path.join(__dirname, '../uploads'));
    console.log(`   - 配置的上传目录: ${uploadsDir}`);
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
    console.log(`   - UPLOADS_PATH: ${process.env.UPLOADS_PATH || '未设置'}`);
    
    try {
      const stats = await fs.stat(uploadsDir);
      console.log(`   ✓ 目录存在`);
      console.log(`   - 是否目录: ${stats.isDirectory()}`);
      
      // 列出文件
      try {
        const files = await fs.readdir(uploadsDir);
        console.log(`   - 文件/目录数量: ${files.length}`);
        if (files.length > 0 && files.length <= 10) {
          console.log(`   - 文件列表:`);
          for (const file of files) {
            try {
              const filePath = path.join(uploadsDir, file);
              const fileStats = await fs.stat(filePath);
              console.log(`     * ${file} (${fileStats.isDirectory() ? '目录' : `${(fileStats.size / 1024).toFixed(2)} KB`})`);
            } catch (err) {
              console.log(`     * ${file} (无法读取)`);
            }
          }
        } else if (files.length > 10) {
          console.log(`   - 文件列表（前10个）:`);
          for (const file of files.slice(0, 10)) {
            try {
              const filePath = path.join(uploadsDir, file);
              const fileStats = await fs.stat(filePath);
              console.log(`     * ${file} (${fileStats.isDirectory() ? '目录' : `${(fileStats.size / 1024).toFixed(2)} KB`})`);
            } catch (err) {
              console.log(`     * ${file} (无法读取)`);
            }
          }
          console.log(`     ... 还有 ${files.length - 10} 个文件`);
        }
      } catch (readErr) {
        console.log(`   ⚠️  无法读取目录内容: ${readErr.message}`);
      }
    } catch (err) {
      console.log(`   ✗ 目录不存在或无法访问: ${err.message}`);
      console.log(`   ⚠️  请检查Railway Volume配置，挂载路径应为: /data/uploads`);
    }
    
    // 5. 检查环境变量
    console.log('\n5. 检查关键环境变量...');
    const envVars = ['DATABASE_URL', 'NODE_ENV', 'UPLOADS_PATH', 'DB_TYPE'];
    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value) {
        // 隐藏敏感信息
        if (envVar === 'DATABASE_URL') {
          try {
            const url = new URL(value);
          console.log(`   ✓ ${envVar}: ${url.protocol}//${url.username}@${url.hostname}:${url.port}${url.pathname}`);
          } catch {
            console.log(`   ✓ ${envVar}: 已设置（格式可能不正确）`);
          }
        } else {
          console.log(`   ✓ ${envVar}: ${value}`);
        }
      } else {
        console.log(`   ⚠️  ${envVar}: 未设置`);
      }
    }
    
    console.log('\n=== 诊断完成 ===');
    console.log('\n建议检查项:');
    console.log('1. 确认Railway中PostgreSQL服务是否连接到正确的数据库实例');
    console.log('2. 确认Railway Volume已正确挂载到 /data/uploads');
    console.log('3. 检查部署日志，查看是否有错误信息');
    console.log('4. 如果数据库中有记录但文件丢失，可能是Volume未正确挂载');
    console.log('5. 如果数据库和文件都丢失，可能是连接到了新的数据库实例');
    
  } catch (error) {
    console.error('诊断过程中出错:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

diagnose();

