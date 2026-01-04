const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const db = require('../services/db');
const { parsePDF } = require('../services/pdf');

// 获取上传目录路径（支持Railway Volume持久化存储）
// 优先级：环境变量 UPLOADS_PATH > /data/uploads (Railway Volume) > 本地开发路径
const uploadsDir = process.env.UPLOADS_PATH || 
                   (process.env.NODE_ENV === 'production' ? '/data/uploads' : path.join(__dirname, '../../backend/uploads'));

// 确保上传目录存在
(async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log(`✓ 上传目录已准备: ${uploadsDir}`);
  } catch (error) {
    console.error('创建上传目录失败:', error);
  }
})();

// 配置multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('只支持PDF文件'));
    }
  },
  // 处理文件名编码
  preservePath: false
});

// PDF上传接口
router.post('/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未上传文件' });
    }

    const filePath = req.file.path;
    let fileName = req.file.originalname || '未命名文件';

    // 处理文件名编码（确保中文正确）
    // multer可能会将文件名编码为latin1，需要转换为utf-8
    if (typeof fileName === 'string') {
      try {
        // 检查是否包含非ASCII字符且看起来像乱码
        const hasNonAscii = /[^\x00-\x7F]/.test(fileName);
        // 尝试从latin1恢复utf-8（multer常见问题）
        const decoded = Buffer.from(fileName, 'latin1').toString('utf-8');
        // 如果解码后的字符串包含更多中文字符，使用解码后的
        if (decoded !== fileName && /[\u4e00-\u9fa5]/.test(decoded)) {
          fileName = decoded;
        }
      } catch (e) {
        console.warn('文件名编码处理失败，使用原始文件名:', e.message);
      }
    }
    
    const title = fileName.replace(/\.pdf$/i, '').trim() || '未命名文档';

    // 解析PDF
    const pdfData = await parsePDF(await fs.readFile(filePath));
    
    // 获取模块ID和知识库ID（从请求体）
    const moduleId = req.body.moduleId || null;
    let knowledgeBaseId = req.body.knowledge_base_id || req.body.knowledgeBaseId || null;
    
    // 如果没有提供知识库ID，使用默认知识库
    if (!knowledgeBaseId) {
      const defaultKb = await db.get(
        'SELECT id FROM knowledge_bases WHERE is_default = 1 LIMIT 1'
      );
      if (defaultKb) {
        knowledgeBaseId = defaultKb.id;
      }
    }

    // 创建数据库记录
    const id = uuidv4();
    const now = Date.now();
    const pageContentJson = JSON.stringify(pdfData.pages);

    await db.run(
      `INSERT INTO source_items 
       (id, type, title, raw_content, file_path, page_count, page_content, module_id, knowledge_base_id, created_at, updated_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        'pdf',
        title,
        pdfData.text,
        filePath,
        pdfData.pageCount,
        pageContentJson,
        moduleId,
        knowledgeBaseId,
        now,
        now,
        'processed'
      ]
    );

    // 获取创建的记录
    const item = await db.get('SELECT * FROM source_items WHERE id = ?', [id]);

    res.json({
      success: true,
      data: {
        id: item.id,
        title: item.title,
        pageCount: pdfData.pageCount,
        filePath: item.file_path
      }
    });
  } catch (error) {
    console.error('PDF上传失败:', error);
    
    // 清理已上传的文件
    if (req.file) {
      fs.unlink(req.file.path).catch(console.error);
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'PDF上传失败'
    });
  }
});

module.exports = router;

