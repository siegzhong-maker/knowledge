const express = require('express');
const router = express.Router();
const db = require('../services/db');

// 获取所有标签
router.get('/', async (req, res) => {
  try {
    const tags = await db.all('SELECT * FROM tags ORDER BY count DESC, name ASC');
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('获取标签失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建标签
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '标签名称不能为空' });
    }

    // 检查标签是否已存在
    const existing = await db.get('SELECT * FROM tags WHERE name = ?', [name]);
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    const now = Date.now();
    const result = await db.run(
      'INSERT INTO tags (name, color, count, created_at) VALUES (?, ?, ?, ?)',
      [name, color || '#6366f1', 0, now]
    );

    const tag = await db.get('SELECT * FROM tags WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    console.error('创建标签失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新标签
router.put('/:id', async (req, res) => {
  try {
    const { name, color } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的字段' });
    }

    params.push(req.params.id);
    await db.run(
      `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const tag = await db.get('SELECT * FROM tags WHERE id = ?', [req.params.id]);
    if (!tag) {
      return res.status(404).json({ success: false, message: '标签不存在' });
    }

    res.json({ success: true, data: tag });
  } catch (error) {
    console.error('更新标签失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除标签
router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM tags WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('删除标签失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

