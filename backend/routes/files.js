const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const db = require('../services/db');

/**
 * 获取PDF文件
 * GET /api/files/pdf/:id
 */
router.get('/pdf/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('请求PDF文件，ID:', id);
    
    // 从数据库获取文件信息
    const item = await db.get(
      'SELECT file_path, type FROM source_items WHERE id = ?',
      [id]
    );
    
    if (!item) {
      console.error('PDF文件请求失败：文档不存在，ID:', id);
      return res.status(404).json({ 
        success: false, 
        message: '文档不存在' 
      });
    }
    
    console.log('找到文档:', { id, type: item.type, file_path: item.file_path });
    
    if (item.type !== 'pdf') {
      return res.status(400).json({ 
        success: false, 
        message: '该文档不是PDF类型' 
      });
    }
    
    if (!item.file_path) {
      console.error('PDF文件请求失败：文件路径为空，ID:', id);
      return res.status(404).json({ 
        success: false, 
        message: 'PDF文件不存在' 
      });
    }
    
    // 验证文件路径安全性（防止路径遍历攻击）
    let filePath;
    const uploadsDir = path.resolve(__dirname, '../../backend/uploads');
    
    // 处理文件路径：可能是绝对路径或相对路径
    if (path.isAbsolute(item.file_path)) {
      // 如果是绝对路径，直接使用
      filePath = item.file_path;
    } else {
      // 如果是相对路径，相对于uploads目录
      filePath = path.join(uploadsDir, item.file_path);
    }
    
    // 规范化路径（解析..和.）
    filePath = path.normalize(filePath);
    
    // 确保文件路径在uploads目录内（防止路径遍历攻击）
    const resolvedFilePath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (!resolvedFilePath.startsWith(resolvedUploadsDir)) {
      console.error('文件路径安全检查失败:', {
        filePath: resolvedFilePath,
        uploadsDir: resolvedUploadsDir
      });
      return res.status(403).json({ 
        success: false, 
        message: '文件访问被拒绝' 
      });
    }
    
    // 检查文件是否存在
    try {
      await fs.access(resolvedFilePath);
      console.log('PDF文件存在:', resolvedFilePath);
    } catch (error) {
      console.error('PDF文件不存在:', resolvedFilePath, error);
      return res.status(404).json({ 
        success: false, 
        message: `PDF文件不存在: ${error.message}` 
      });
    }
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    
    // 支持Range请求（用于断点续传和流式加载）
    const stat = await fs.stat(resolvedFilePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    console.log('返回PDF文件:', {
      id,
      filePath: resolvedFilePath,
      fileSize,
      hasRange: !!range
    });
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = await fs.open(resolvedFilePath, 'r');
      const stream = file.createReadStream({ start, end });
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunksize);
      
      stream.pipe(res);
    } else {
      // 完整文件传输
      res.setHeader('Content-Length', fileSize);
      res.sendFile(resolvedFilePath);
    }
  } catch (error) {
    console.error('获取PDF文件失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '获取PDF文件失败' 
    });
  }
});

module.exports = router;

