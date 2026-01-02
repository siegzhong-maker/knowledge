const express = require('express');
const router = express.Router();
const db = require('../services/db');

// 导出JSON
router.get('/json', async (req, res) => {
  try {
    const items = await db.all('SELECT * FROM source_items WHERE status != ? ORDER BY created_at DESC', ['archived']);
    const tags = await db.all('SELECT * FROM tags');

    const data = {
      export_date: new Date().toISOString(),
      items: items.map(item => ({
        ...item,
        tags: JSON.parse(item.tags || '[]')
      })),
      tags: tags
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="knowledge-export-${Date.now()}.json"`);
    res.json(data);
  } catch (error) {
    console.error('导出JSON失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 导出Markdown
router.get('/markdown', async (req, res) => {
  try {
    const items = await db.all('SELECT * FROM source_items WHERE status != ? ORDER BY created_at DESC', ['archived']);

    let markdown = `# 知识库导出\n\n导出时间: ${new Date().toLocaleString('zh-CN')}\n\n---\n\n`;

    for (const item of items) {
      const tags = JSON.parse(item.tags || '[]');
      const tagsStr = tags.length > 0 ? tags.map(t => `#${t}`).join(' ') : '';
      
      markdown += `## ${item.title}\n\n`;
      markdown += `**类型**: ${item.type}  |  **来源**: ${item.source || '未知'}  |  **日期**: ${new Date(item.created_at).toLocaleString('zh-CN')}\n\n`;
      if (tagsStr) {
        markdown += `**标签**: ${tagsStr}\n\n`;
      }
      if (item.original_url) {
        markdown += `**链接**: ${item.original_url}\n\n`;
      }
      if (item.summary_ai) {
        markdown += `### 摘要\n\n${item.summary_ai}\n\n`;
      }
      if (item.raw_content) {
        markdown += `### 内容\n\n${item.raw_content}\n\n`;
      }
      markdown += '---\n\n';
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="knowledge-export-${Date.now()}.md"`);
    res.send(markdown);
  } catch (error) {
    console.error('导出Markdown失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

