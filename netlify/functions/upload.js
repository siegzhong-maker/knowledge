// 文件上传 API - 使用 Supabase Storage
const db = require('./utils/db');
const { createSuccessResponse, createErrorResponse, handleOptions, corsHeaders } = require('./utils/helpers');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  try {
    // 注意：Netlify Functions 对文件上传有大小限制（通常 6MB）
    // 对于大文件，建议使用客户端直接上传到 Supabase Storage
    
    if (event.httpMethod === 'POST') {
      const contentType = event.headers['content-type'] || '';
      
      // 检查是否是 multipart/form-data
      if (contentType.includes('multipart/form-data')) {
        // 解析 multipart 数据
        // 注意：Netlify Functions 需要特殊处理 multipart 数据
        // 建议使用客户端直接上传到 Supabase Storage
        
        return createErrorResponse(400, '文件上传请使用 Supabase Storage 客户端直接上传');
      }
      
      // 如果是从客户端接收已上传的文件信息
      const body = JSON.parse(event.body || '{}');
      const { fileUrl, fileName, fileSize, type, knowledge_base_id, module_id } = body;
      
      if (!fileUrl || !fileName) {
        return createErrorResponse(400, '文件 URL 和文件名不能为空');
      }
      
      // 创建文档记录
      const id = uuidv4();
      const now = Date.now();
      
      const item = {
        id,
        type: type || 'pdf',
        title: fileName,
        file_path: fileUrl,
        knowledge_base_id: knowledge_base_id || null,
        module_id: module_id || null,
        created_at: now,
        updated_at: now,
        status: 'pending'
      };
      
      const { data, error } = await db.client.from('source_items').insert(item).select().single();
      
      if (error) throw error;
      
      return createSuccessResponse({
        data: {
          ...data,
          tags: typeof data.tags === 'string' ? JSON.parse(data.tags || '[]') : data.tags
        }
      }, 201);
    }
    
    return createErrorResponse(404, '路由不存在');
  } catch (error) {
    console.error('Upload API error:', error);
    return createErrorResponse(500, error.message || '服务器内部错误');
  }
};

