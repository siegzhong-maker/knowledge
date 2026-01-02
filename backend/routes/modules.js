const express = require('express');
const router = express.Router();
const db = require('../services/db');

// 获取所有模块列表（支持按知识库过滤）
router.get('/', async (req, res) => {
  try {
    const { knowledge_base_id } = req.query;
    let modules;
    
    // 优先使用modules表，如果不存在则使用entrepreneurship_modules（向后兼容）
    try {
      if (knowledge_base_id) {
        modules = await db.all(
          'SELECT * FROM modules WHERE knowledge_base_id = ? ORDER BY order_index ASC',
          [knowledge_base_id]
        );
      } else {
        // 如果没有指定知识库，尝试从默认知识库获取
        const defaultKb = await db.get(
          'SELECT id FROM knowledge_bases WHERE is_default = 1 LIMIT 1'
        );
        if (defaultKb) {
          modules = await db.all(
            'SELECT * FROM modules WHERE knowledge_base_id = ? ORDER BY order_index ASC',
            [defaultKb.id]
          );
        } else {
          // 如果没有默认知识库，返回所有模块（向后兼容）
          modules = await db.all(
            'SELECT * FROM modules ORDER BY order_index ASC'
          );
        }
      }
    } catch (e) {
      // 如果modules表不存在，尝试使用旧的entrepreneurship_modules表
      modules = await db.all(
        'SELECT * FROM entrepreneurship_modules ORDER BY order_index ASC'
      );
    }
    
    res.json({
      success: true,
      data: modules
    });
  } catch (error) {
    console.error('获取模块列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取模块列表失败'
    });
  }
});

// 获取按步骤分组的模块（必须在 /:id 之前，否则会被 /:id 路由捕获）
router.get('/grouped/by-steps', async (req, res) => {
  try {
    const { knowledge_base_id } = req.query;
    let modules;
    
    // 优先使用modules表，如果不存在则使用entrepreneurship_modules（向后兼容）
    try {
      if (knowledge_base_id) {
        modules = await db.all(
          'SELECT * FROM modules WHERE knowledge_base_id = ? ORDER BY step_number ASC, checkpoint_number ASC',
          [knowledge_base_id]
        );
      } else {
        // 如果没有指定知识库，尝试从默认知识库获取
        const defaultKb = await db.get(
          'SELECT id FROM knowledge_bases WHERE is_default = 1 LIMIT 1'
        );
        if (defaultKb) {
          modules = await db.all(
            'SELECT * FROM modules WHERE knowledge_base_id = ? ORDER BY step_number ASC, checkpoint_number ASC',
            [defaultKb.id]
          );
        } else {
          // 如果没有默认知识库，返回所有模块（向后兼容）
          modules = await db.all(
            'SELECT * FROM modules ORDER BY step_number ASC, checkpoint_number ASC'
          );
        }
      }
    } catch (e) {
      // 如果modules表不存在，尝试使用旧的entrepreneurship_modules表
      modules = await db.all(
        'SELECT * FROM entrepreneurship_modules ORDER BY step_number ASC, checkpoint_number ASC'
      );
    }
    
    // 按步骤分组
    const grouped = {};
    modules.forEach(module => {
      const stepKey = `step${module.step_number}`;
      if (!grouped[stepKey]) {
        grouped[stepKey] = {
          stepNumber: module.step_number,
          stepName: module.step_name,
          checkpoints: []
        };
      }
      grouped[stepKey].checkpoints.push(module);
    });
    
    res.json({
      success: true,
      data: Object.values(grouped)
    });
  } catch (error) {
    console.error('获取分组模块失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取分组模块失败'
    });
  }
});

// 获取单个模块详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let module;
    
    // 优先使用modules表
    try {
      module = await db.get(
        'SELECT * FROM modules WHERE id = ?',
        [id]
      );
    } catch (e) {
      // 如果modules表不存在，尝试使用旧的entrepreneurship_modules表
      module = await db.get(
        'SELECT * FROM entrepreneurship_modules WHERE id = ?',
        [id]
      );
    }
    
    if (!module) {
      return res.status(404).json({
        success: false,
        message: '模块不存在'
      });
    }
    
    res.json({
      success: true,
      data: module
    });
  } catch (error) {
    console.error('获取模块详情失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取模块详情失败'
    });
  }
});

// 获取模块关联的文档（支持未分类，id为'uncategorized'时返回module_id为null的文档）
router.get('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    let documents;
    
    if (id === 'uncategorized') {
      // 获取未分类的文档（module_id为null）
      documents = await db.all(
        'SELECT * FROM source_items WHERE (module_id IS NULL OR module_id = ?) AND type = ? AND status != ? ORDER BY created_at DESC',
        ['', 'pdf', 'archived']
      );
    } else {
      documents = await db.all(
        'SELECT * FROM source_items WHERE module_id = ? AND type = ? AND status != ? ORDER BY created_at DESC',
        [id, 'pdf', 'archived']
      );
    }
    
    // 解析tags和page_content
    const parsed = documents.map(doc => {
      const parsed = { ...doc };
      if (doc.tags) {
        try {
          parsed.tags = JSON.parse(doc.tags);
        } catch (e) {
          parsed.tags = [];
        }
      }
      if (doc.page_content) {
        try {
          parsed.page_content = JSON.parse(doc.page_content);
        } catch (e) {
          parsed.page_content = [];
        }
      }
      if (doc.metadata) {
        try {
          parsed.metadata = JSON.parse(doc.metadata);
        } catch (e) {
          parsed.metadata = null;
        }
      }
      return parsed;
    });
    
    res.json({
      success: true,
      data: parsed
    });
  } catch (error) {
    console.error('获取模块文档失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取模块文档失败'
    });
  }
});

// 获取模块的对话历史统计（支持未分类）
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 处理未分类模块
    if (id === 'uncategorized') {
      const docCount = await db.get(
        'SELECT COUNT(*) as count FROM source_items WHERE (module_id IS NULL OR module_id = ?) AND type = ? AND status != ?',
        ['', 'pdf', 'archived']
      );
      
      return res.json({
        success: true,
        data: {
          module: {
            id: 'uncategorized',
            step_name: '未分类',
            checkpoint_name: '未分类文档'
          },
          documentCount: docCount?.count || 0,
          conversationCount: 0 // 由前端统计
        }
      });
    }
    
    // 这里需要从localStorage中统计，暂时返回基础信息
    // 实际实现中，对话历史存储在localStorage，需要前端统计
    
    let module;
    try {
      module = await db.get(
        'SELECT * FROM modules WHERE id = ?',
        [id]
      );
    } catch (e) {
      module = await db.get(
        'SELECT * FROM entrepreneurship_modules WHERE id = ?',
        [id]
      );
    }
    
    if (!module) {
      return res.status(404).json({
        success: false,
        message: '模块不存在'
      });
    }
    
    // 获取文档数量
    const docCount = await db.get(
      'SELECT COUNT(*) as count FROM source_items WHERE module_id = ? AND type = ? AND status != ?',
      [id, 'pdf', 'archived']
    );
    
    res.json({
      success: true,
      data: {
        module,
        documentCount: docCount?.count || 0,
        conversationCount: 0 // 由前端统计
      }
    });
  } catch (error) {
    console.error('获取模块统计失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取模块统计失败'
    });
  }
});

// 批量创建模块
router.post('/batch', async (req, res) => {
  try {
    const { knowledge_base_id, modules } = req.body;
    
    if (!knowledge_base_id) {
      return res.status(400).json({
        success: false,
        message: '知识库ID不能为空'
      });
    }
    
    if (!modules || !Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({
        success: false,
        message: '模块数据不能为空'
      });
    }
    
    // 验证知识库是否存在
    const kb = await db.get(
      'SELECT id FROM knowledge_bases WHERE id = ?',
      [knowledge_base_id]
    );
    
    if (!kb) {
      return res.status(404).json({
        success: false,
        message: '知识库不存在'
      });
    }
    
    // 验证模块数据格式
    for (const module of modules) {
      if (!module.step_number || !module.step_name) {
        return res.status(400).json({
          success: false,
          message: '模块数据格式错误：缺少step_number或step_name'
        });
      }
      if (module.checkpoint_number === undefined || !module.checkpoint_name) {
        return res.status(400).json({
          success: false,
          message: '模块数据格式错误：缺少checkpoint_number或checkpoint_name'
        });
      }
    }
    
    // 批量插入模块
    const now = Date.now();
    const createdModules = [];
    
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      const moduleId = module.id || `${knowledge_base_id}-step${module.step_number}-checkpoint${module.checkpoint_number}`;
      const orderIndex = module.order_index || (i + 1);
      
      try {
        await db.run(`
          INSERT INTO modules 
          (id, knowledge_base_id, step_number, step_name, checkpoint_number, checkpoint_name, description, order_index, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          moduleId,
          knowledge_base_id,
          module.step_number,
          module.step_name,
          module.checkpoint_number,
          module.checkpoint_name,
          module.description || '',
          orderIndex,
          module.created_at || now
        ]);
        
        createdModules.push({
          id: moduleId,
          knowledge_base_id,
          step_number: module.step_number,
          step_name: module.step_name,
          checkpoint_number: module.checkpoint_number,
          checkpoint_name: module.checkpoint_name,
          description: module.description || '',
          order_index: orderIndex
        });
      } catch (err) {
        // 如果模块已存在，跳过
        if (err.message && err.message.includes('UNIQUE constraint')) {
          console.warn(`模块 ${moduleId} 已存在，跳过`);
        } else {
          console.error(`创建模块 ${moduleId} 失败:`, err);
          throw err;
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        count: createdModules.length,
        modules: createdModules
      }
    });
  } catch (error) {
    console.error('批量创建模块失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '批量创建模块失败'
    });
  }
});

module.exports = router;

