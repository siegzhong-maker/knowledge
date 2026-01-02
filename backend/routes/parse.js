const express = require('express');
const router = express.Router();
const { parseURL } = require('../services/parser');

// 解析URL
router.post('/url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'URL不能为空' });
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'URL格式无效' });
    }

    const result = await parseURL(url);

    res.json({
      success: true,
      data: {
        title: result.title,
        description: result.description,
        content: result.content,
        url: result.url
      }
    });
  } catch (error) {
    console.error('URL解析失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'URL解析失败' 
    });
  }
});

module.exports = router;

