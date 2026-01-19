// Knowledge Bases API - 知识库管理
const db = require('./utils/db');
const { createSuccessResponse, createErrorResponse, handleOptions } = require('./utils/helpers');
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  let path = event.path;
  if (path.startsWith('/.netlify/functions/knowledge-bases')) {
    path = path.replace('/.netlify/functions/knowledge-bases', '');
  } else if (path.startsWith('/api/knowledge-bases')) {
    path = path.replace('/api/knowledge-bases', '');
  }
  path = path || '/';
  
  const method = event.httpMethod;

  try {
    // GET /api/knowledge-bases - 获取所有知识库
    if (method === 'GET' && (path === '/' || path === '')) {
      const { data, error } = await db.client.from('knowledge_bases')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return createSuccessResponse({ data: data || [] });
    }

    // GET /api/knowledge-bases/default - 获取默认知识库
    if (method === 'GET' && path === '/default') {
      let { data: kb, error } = await db.client.from('knowledge_bases')
        .select('*')
        .eq('is_default', true)
        .limit(1)
        .single();
      
      if (error && error.code === 'PGRST116') {
        // 如果没有默认知识库，返回第一个
        const result = await db.client.from('knowledge_bases')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        
        if (result.error && result.error.code === 'PGRST116') {
          return createSuccessResponse({ data: null });
        }
        
        kb = result.data;
      } else if (error) {
        throw error;
      }
      
      return createSuccessResponse({ data: kb });
    }

    // GET /api/knowledge-bases/:id - 获取单个知识库
    if (method === 'GET' && path !== '/' && path !== '' && path !== '/default') {
      const id = path.startsWith('/') ? path.substring(1) : path;
      
      const { data: kb, error } = await db.client.from('knowledge_bases')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return createErrorResponse(404, '知识库不存在');
        }
        throw error;
      }
      
      return createSuccessResponse({ data: kb });
    }

    // POST /api/knowledge-bases - 创建知识库
    if (method === 'POST' && (path === '/' || path === '')) {
      const body = JSON.parse(event.body || '{}');
      const { name, description, icon, color } = body;
      
      if (!name || name.trim() === '') {
        return createErrorResponse(400, '知识库名称不能为空');
      }
      
      const id = `kb-${uuidv4().split('-')[0]}`;
      const now = Date.now();
      
      const kb = {
        id,
        name: name.trim(),
        description: description || null,
        icon: icon || 'book',
        color: color || '#6366f1',
        is_default: false,
        created_at: now,
        updated_at: now
      };
      
      const { data, error } = await db.client.from('knowledge_bases')
        .insert(kb)
        .select()
        .single();
      
      if (error) throw error;
      
      return createSuccessResponse({ data }, 201);
    }

    // PUT /api/knowledge-bases/:id - 更新知识库
    if (method === 'PUT' && path !== '/' && path !== '') {
      const id = path.startsWith('/') ? path.substring(1) : path;
      const body = JSON.parse(event.body || '{}');
      
      const updateData = {
        ...body,
        updated_at: Date.now()
      };
      
      // 如果设置为默认，需要先取消其他默认知识库
      if (updateData.is_default === true) {
        await db.client.from('knowledge_bases')
          .update({ is_default: false })
          .neq('id', id);
      }
      
      const { data, error } = await db.client.from('knowledge_bases')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return createErrorResponse(404, '知识库不存在');
        }
        throw error;
      }
      
      return createSuccessResponse({ data });
    }

    // DELETE /api/knowledge-bases/:id - 删除知识库
    if (method === 'DELETE' && path !== '/' && path !== '') {
      const id = path.startsWith('/') ? path.substring(1) : path;
      
      const { error } = await db.client.from('knowledge_bases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return createSuccessResponse({ message: '删除成功' });
    }

    return createErrorResponse(404, '路由不存在');
  } catch (error) {
    console.error('Knowledge Bases API error:', error);
    return createErrorResponse(500, error.message || '服务器内部错误');
  }
};

