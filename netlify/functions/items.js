// Items API - 文档管理
const db = require('./utils/db');
const { v4: uuidv4 } = require('uuid');

// 处理 CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event, context) => {
  // 处理 OPTIONS 请求（CORS 预检）
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // 从路径中提取子路径（移除 /api/items 前缀）
  let path = event.path;
  if (path.startsWith('/.netlify/functions/items')) {
    path = path.replace('/.netlify/functions/items', '');
  } else if (path.startsWith('/api/items')) {
    path = path.replace('/api/items', '');
  }
  path = path || '/';
  
  const method = event.httpMethod;

  try {
    // GET /api/items - 获取所有知识项
    if (method === 'GET' && (path === '/' || path === '')) {
      const { type, status, search, page = 1, limit = 50, knowledge_base_id } = event.queryStringParameters || {};
      
      // 使用 Supabase 客户端直接查询
      let query = db.client.from('source_items').select('id, type, title, original_url, summary_ai, source, tags, file_path, page_count, created_at, updated_at, status, knowledge_base_id, module_id, knowledge_extracted');
      
      // 应用过滤条件
      if (type && type !== 'all') {
        query = query.eq('type', type);
      }
      
      if (knowledge_base_id) {
        query = query.eq('knowledge_base_id', knowledge_base_id);
      }
      
      if (status === 'archived') {
        query = query.eq('status', 'archived');
      } else if (status !== 'all') {
        query = query.neq('status', 'archived');
      }
      
      if (search) {
        query = query.or(`title.ilike.%${search}%,summary_ai.ilike.%${search}%`);
      }
      
      // 排序和分页
      query = query.order('created_at', { ascending: false });
      query = query.range((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit) - 1);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // 解析 tags JSON
      const itemsWithParsedTags = (data || []).map(item => ({
        ...item,
        tags: typeof item.tags === 'string' ? JSON.parse(item.tags || '[]') : item.tags
      }));
      
      // 获取总数
      const countQuery = db.client.from('source_items').select('*', { count: 'exact', head: true });
      if (status !== 'all' && status !== 'archived') {
        countQuery.neq('status', 'archived');
      }
      const { count: total } = await countQuery;
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          data: itemsWithParsedTags,
          total: total || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: (parseInt(page) * parseInt(limit)) < (total || 0)
        })
      };
    }

    // GET /api/items/stats - 获取统计信息
    if (method === 'GET' && path === '/stats') {
      // 获取总数
      const { count: total } = await db.client.from('source_items').select('*', { count: 'exact', head: true });
      
      // 获取各类型数量
      const { count: pdfCount } = await db.client.from('source_items').select('*', { count: 'exact', head: true }).eq('type', 'pdf');
      const { count: urlCount } = await db.client.from('source_items').select('*', { count: 'exact', head: true }).eq('type', 'url');
      
      // 获取已提取数量
      const { count: extractedCount } = await db.client.from('source_items').select('*', { count: 'exact', head: true }).eq('knowledge_extracted', true);
      
      // 获取今日新增（今天 00:00 到现在）
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTimestamp = todayStart.getTime();
      const { count: todayCount } = await db.client.from('source_items')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayTimestamp);
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          data: {
            total: total || 0,
            pdf: pdfCount || 0,
            url: urlCount || 0,
            extracted: extractedCount || 0,
            today: todayCount || 0
          }
        })
      };
    }

    // GET /api/items/:id - 获取单个知识项
    if (method === 'GET' && path !== '/' && path !== '' && path !== '/stats') {
      const id = path.startsWith('/') ? path.substring(1) : path;
      console.log('获取文档详情:', { id, path, eventPath: event.path });
      
      const { data, error } = await db.client.from('source_items').select('*').eq('id', id).single();
      
      if (error) {
        console.error('查询文档失败:', { id, error: error.message, code: error.code });
        if (error.code === 'PGRST116') {
          return {
            statusCode: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ success: false, message: '文档不存在' })
          };
        }
        throw error;
      }
      
      if (!data) {
        console.error('文档不存在:', id);
        return {
          statusCode: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ success: false, message: '文档不存在' })
        };
      }
      
      console.log('文档查询成功:', { id, type: data.type, hasFilePath: !!data.file_path });
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          data: {
            ...data,
            tags: typeof data.tags === 'string' ? JSON.parse(data.tags || '[]') : data.tags
          }
        })
      };
    }

    // POST /api/items - 创建知识项
    if (method === 'POST' && path === '/') {
      const body = JSON.parse(event.body || '{}');
      const { type, title, raw_content, original_url, summary_ai, source, tags, knowledge_base_id, module_id } = body;
      
      if (!type || !title) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ success: false, message: '类型和标题不能为空' })
        };
      }
      
      const id = uuidv4();
      const now = Date.now();
      
      const item = {
        id,
        type,
        title,
        raw_content: raw_content || null,
        original_url: original_url || null,
        summary_ai: summary_ai || null,
        source: source || null,
        tags: JSON.stringify(tags || []),
        knowledge_base_id: knowledge_base_id || null,
        module_id: module_id || null,
        created_at: now,
        updated_at: now,
        status: 'pending'
      };
      
      const { data, error } = await db.client.from('source_items').insert(item).select().single();
      
      if (error) throw error;
      
      return {
        statusCode: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          data: {
            ...data,
            tags: typeof data.tags === 'string' ? JSON.parse(data.tags || '[]') : data.tags
          }
        })
      };
    }

    // PUT /api/items/:id - 更新知识项
    if (method === 'PUT' && path !== '/' && path !== '') {
      const id = path.startsWith('/') ? path.substring(1) : path;
      const body = JSON.parse(event.body || '{}');
      
      const updateData = {
        ...body,
        updated_at: Date.now()
      };
      
      if (updateData.tags && Array.isArray(updateData.tags)) {
        updateData.tags = JSON.stringify(updateData.tags);
      }
      
      const { data, error } = await db.client.from('source_items').update(updateData).eq('id', id).select().single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return {
            statusCode: 404,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ success: false, message: '文档不存在' })
          };
        }
        throw error;
      }
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          data: {
            ...data,
            tags: typeof data.tags === 'string' ? JSON.parse(data.tags || '[]') : data.tags
          }
        })
      };
    }

    // DELETE /api/items/:id - 删除知识项
    if (method === 'DELETE' && path !== '/' && path !== '') {
      const id = path.startsWith('/') ? path.substring(1) : path;
      const { error } = await db.client.from('source_items').delete().eq('id', id);
      
      if (error) throw error;
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: true, message: '删除成功' })
      };
    }

    // 404 - 未找到路由
    return {
      statusCode: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ success: false, message: '路由不存在' })
    };
  } catch (error) {
    console.error('Items API error:', error);
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        message: error.message || '服务器内部错误'
      })
    };
  }
};

