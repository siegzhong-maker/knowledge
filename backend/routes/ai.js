const express = require('express');
const router = express.Router();
const { generateSummary, chat, suggestTags, testConnection } = require('../services/ai');
const db = require('../services/db');

// 生成摘要
router.post('/summary', async (req, res) => {
  try {
    const { content, itemId, userApiKey } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: '内容不能为空' });
    }

    const summary = await generateSummary(content, itemId, userApiKey || null);

    res.json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    console.error('生成摘要失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '生成摘要失败' 
    });
  }
});

// AI对话（流式响应）
router.post('/chat', async (req, res) => {
  try {
    const { messages, context, userApiKey } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: '消息不能为空' });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await chat(messages, context, userApiKey || null);

    // 读取流并发送SSE事件
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              break;
            }
            try {
              const json = JSON.parse(data);
              if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
                res.write(`data: ${JSON.stringify({ content: json.choices[0].delta.content })}\n\n`);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (error) {
    console.error('AI对话失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: error.message || 'AI对话失败' 
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// 标签建议
router.post('/suggest-tags', async (req, res) => {
  try {
    const { content, userApiKey } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: '内容不能为空' });
    }

    const tags = await suggestTags(content, userApiKey || null);

    res.json({
      success: true,
      data: { tags }
    });
  } catch (error) {
    console.error('标签建议失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '标签建议失败' 
    });
  }
});

module.exports = router;

