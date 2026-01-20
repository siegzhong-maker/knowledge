// Knowledge Extraction API - Netlify Function
// 处理知识提取相关的 API 请求

const db = require('./utils/db');
const { v4: uuidv4 } = require('uuid');
const { createSuccessResponse, createErrorResponse, handleOptions, extractIdFromPath } = require('./utils/helpers');

// 导入知识提取服务（需要适配 Supabase）
// 注意：knowledge-extractor 使用 backend/services/db，我们需要确保它使用 Supabase
const path = require('path');

// 临时解决方案：直接使用 Supabase 客户端，并创建一个适配的 extractFromDocuments 函数
// 或者我们可以修改 knowledge-extractor 以接受 db 实例作为参数

/**
 * 计算预估剩余时间（ETA）
 */
function calculateETA(progressHistory, currentProgress, startTime) {
  if (!progressHistory || progressHistory.length < 2 || currentProgress <= 0 || currentProgress >= 100) {
    return null;
  }
  
  const recentHistory = progressHistory.slice(-5);
  if (recentHistory.length < 2) {
    return null;
  }
  
  let totalTimePerPercent = 0;
  let validPairs = 0;
  
  for (let i = 1; i < recentHistory.length; i++) {
    const prev = recentHistory[i - 1];
    const curr = recentHistory[i];
    const progressDiff = curr.progress - prev.progress;
    const timeDiff = curr.timestamp - prev.timestamp;
    
    if (progressDiff > 0 && timeDiff > 0) {
      totalTimePerPercent += timeDiff / progressDiff;
      validPairs++;
    }
  }
  
  if (validPairs === 0) {
    return null;
  }
  
  const avgSecondsPerPercent = (totalTimePerPercent / validPairs) / 1000;
  const remainingProgress = 100 - currentProgress;
  const etaSeconds = Math.round(remainingProgress * avgSecondsPerPercent);
  
  if (etaSeconds > 3600 || etaSeconds < 0) {
    return null;
  }
  
  return etaSeconds;
}

/**
 * 更新任务状态到数据库
 */
async function updateTaskStatus(extractionId, updates) {
  const now = Date.now();
  const task = await db.client.from('extraction_tasks').select('*').eq('id', extractionId).single();
  
  if (!task.data) {
    // 如果任务不存在，创建它
    const newTask = {
      id: extractionId,
      status: updates.status || 'processing',
      total_items: updates.totalItems || 0,
      processed_items: updates.processedItems || 0,
      extracted_count: updates.extractedCount || 0,
      knowledge_item_ids: updates.knowledgeItemIds ? JSON.stringify(updates.knowledgeItemIds) : '[]',
      knowledge_items: updates.knowledgeItems ? JSON.stringify(updates.knowledgeItems) : '[]',
      stage: updates.stage || 'parsing',
      progress: updates.progress || 0,
      current_doc_index: updates.currentDocIndex || 0,
      error: updates.error || null,
      error_details: updates.errorDetails ? JSON.stringify(updates.errorDetails) : null,
      progress_history: updates.progressHistory ? JSON.stringify(updates.progressHistory) : '[]',
      start_time: updates.startTime || now,
      created_at: now,
      updated_at: now
    };
    
    await db.client.from('extraction_tasks').insert(newTask);
  } else {
    // 更新现有任务
    const updateData = {
      updated_at: now
    };
    
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.totalItems !== undefined) updateData.total_items = updates.totalItems;
    if (updates.processedItems !== undefined) updateData.processed_items = updates.processedItems;
    if (updates.extractedCount !== undefined) updateData.extracted_count = updates.extractedCount;
    if (updates.knowledgeItemIds !== undefined) updateData.knowledge_item_ids = JSON.stringify(updates.knowledgeItemIds);
    if (updates.knowledgeItems !== undefined) updateData.knowledge_items = JSON.stringify(updates.knowledgeItems);
    if (updates.stage !== undefined) updateData.stage = updates.stage;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.currentDocIndex !== undefined) updateData.current_doc_index = updates.currentDocIndex;
    if (updates.error !== undefined) updateData.error = updates.error;
    if (updates.errorDetails !== undefined) updateData.error_details = JSON.stringify(updates.errorDetails);
    if (updates.progressHistory !== undefined) updateData.progress_history = JSON.stringify(updates.progressHistory);
    
    await db.client.from('extraction_tasks').update(updateData).eq('id', extractionId);
  }
}

/**
 * 异步执行提取任务
 * 注意：由于 Netlify Functions 有超时限制，长时间任务需要外部处理
 * 这里我们启动任务并立即返回，实际提取在后台进行
 */
async function startExtractionTask(itemIds, knowledgeBaseId, extractionId, userApiKey, extractionOptions) {
  try {
    console.log('[Knowledge] 开始启动提取任务', {
      extractionId,
      itemIds,
      knowledgeBaseId,
      hasUserApiKey: !!userApiKey
    });

    // 设置初始状态
    await updateTaskStatus(extractionId, {
      status: 'processing',
      totalItems: itemIds.length,
      processedItems: 0,
      extractedCount: 0,
      knowledgeItemIds: [],
      knowledgeItems: [],
      stage: 'parsing',
      progress: 0,
      currentDocIndex: 0,
      startTime: Date.now(),
      progressHistory: []
    });

    // 检查 DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('[Knowledge] ❌ DATABASE_URL 未配置！知识提取需要直接连接 PostgreSQL 数据库。');
      console.error('[Knowledge] 请在 Netlify Dashboard > Environment variables 中配置 DATABASE_URL');
      console.error('[Knowledge] 参考: GET_SUPABASE_DATABASE_URL.md');
      
      await updateTaskStatus(extractionId, {
        status: 'failed',
        error: 'DATABASE_URL 环境变量未配置。知识提取需要直接连接 PostgreSQL 数据库。请在 Netlify Dashboard 中配置 DATABASE_URL 环境变量。',
        stage: 'failed',
        errorDetails: {
          name: 'ConfigurationError',
          message: 'DATABASE_URL environment variable is required for knowledge extraction',
          solution: 'Configure DATABASE_URL in Netlify Dashboard > Environment variables. See GET_SUPABASE_DATABASE_URL.md for details.'
        }
      });
      return;
    }

    console.log('[Knowledge] DATABASE_URL 已配置:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    process.env.DB_TYPE = 'postgres';
    
    // 导入知识提取服务
    // 注意：knowledge-extractor 使用 backend/services/db，它会根据 DATABASE_URL 环境变量选择数据库
    let knowledgeExtractor;
    try {
      console.log('[Knowledge] 正在导入知识提取服务...');
      knowledgeExtractor = require('../../backend/services/knowledge-extractor');
      console.log('[Knowledge] ✅ 知识提取服务导入成功');
    } catch (importError) {
      console.error('[Knowledge] ❌ 导入知识提取服务失败:', importError);
      throw new Error(`无法导入知识提取服务: ${importError.message}`);
    }
    
    // 创建进度更新回调
    const updateProgress = async (progress) => {
      const currentTask = await db.client.from('extraction_tasks').select('*').eq('id', extractionId).single();
      const existingTask = currentTask.data;
      
      if (existingTask) {
        // 合并进度数据
        const mergedKnowledgeItemIds = progress.knowledgeItemIds !== undefined
          ? progress.knowledgeItemIds
          : (existingTask.knowledge_item_ids ? JSON.parse(existingTask.knowledge_item_ids) : []);
        const mergedKnowledgeItems = progress.knowledgeItems !== undefined
          ? progress.knowledgeItems
          : (existingTask.knowledge_items ? JSON.parse(existingTask.knowledge_items) : []);
        
        // 更新进度历史
        let progressHistory = existingTask.progress_history ? JSON.parse(existingTask.progress_history) : [];
        if (progress.progress !== undefined) {
          progressHistory.push({
            progress: progress.progress,
            timestamp: Date.now()
          });
          if (progressHistory.length > 20) {
            progressHistory.shift();
          }
        }
        
        await updateTaskStatus(extractionId, {
          ...progress,
          knowledgeItemIds: mergedKnowledgeItemIds,
          knowledgeItems: mergedKnowledgeItems,
          progressHistory,
          status: 'processing'
        });
      }
    };

    // 执行提取（异步，不阻塞）
    knowledgeExtractor.extractFromDocuments(itemIds, knowledgeBaseId, {
      extractionId,
      userApiKey,
      updateProgress,
      ...extractionOptions
    }).then(result => {
      // 提取完成
      const finalKnowledgeItemIds = result.knowledgeItemIds && result.knowledgeItemIds.length > 0
        ? result.knowledgeItemIds
        : [];
      const finalKnowledgeItems = result.knowledgeItems && result.knowledgeItems.length > 0
        ? result.knowledgeItems
        : [];
      
      return updateTaskStatus(extractionId, {
        status: 'completed',
        stage: 'completed',
        totalItems: result.totalItems || itemIds.length,
        processedItems: result.processedItems || itemIds.length,
        extractedCount: result.extractedCount || 0,
        knowledgeItemIds: finalKnowledgeItemIds,
        knowledgeItems: finalKnowledgeItems,
        progress: 100
      });
    }).catch(error => {
      console.error(`[Knowledge] ❌ 提取任务失败 (extractionId: ${extractionId}):`, {
        error: error.message,
        name: error.name,
        stack: error.stack,
        cause: error.cause
      });
      return updateTaskStatus(extractionId, {
        status: 'failed',
        error: error.message || '提取任务执行失败',
        stage: 'failed',
        knowledgeItemIds: [],
        knowledgeItems: [],
        errorDetails: {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 1000), // 限制堆栈长度
          cause: error.cause
        }
      });
    });
  } catch (error) {
    console.error('[Knowledge] ❌ 启动提取任务失败:', {
      error: error.message,
      name: error.name,
      stack: error.stack,
      extractionId
    });
    await updateTaskStatus(extractionId, {
      status: 'failed',
      error: error.message || '启动提取任务失败',
      stage: 'failed',
      errorDetails: {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 1000)
      }
    });
  }
}

exports.handler = async (event, context) => {
  // 处理 OPTIONS 请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // 解析路径
  let path = event.path;
  console.log('[Knowledge Function] 原始路径:', path);
  
  if (path.startsWith('/.netlify/functions/knowledge')) {
    path = path.replace('/.netlify/functions/knowledge', '');
  } else if (path.startsWith('/api/knowledge')) {
    path = path.replace('/api/knowledge', '');
  }
  
  // 处理查询参数（Netlify 会将查询参数放在 event.path 中）
  const queryIndex = path.indexOf('?');
  if (queryIndex !== -1) {
    path = path.substring(0, queryIndex);
  }
  
  path = path || '/';
  console.log('[Knowledge Function] 解析后的路径:', path, '方法:', event.httpMethod);
  
  const method = event.httpMethod;

  try {
    // POST /api/knowledge/extract - 启动知识提取
    if (method === 'POST' && path === '/extract') {
      const body = JSON.parse(event.body || '{}');
      const { itemIds, knowledgeBaseId, extractionOptions = {}, userApiKey } = body;

      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return createErrorResponse(400, '文档ID列表不能为空');
      }

      // 获取默认知识库（如果没有指定）
      let targetKnowledgeBaseId = knowledgeBaseId;
      if (!targetKnowledgeBaseId) {
        const { data: defaultKb } = await db.client
          .from('knowledge_bases')
          .select('*')
          .eq('is_default', true)
          .limit(1)
          .single();
        
        if (!defaultKb) {
          const { data: firstKb } = await db.client
            .from('knowledge_bases')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();
          
          if (!firstKb) {
            return createErrorResponse(400, '请先创建知识库');
          }
          targetKnowledgeBaseId = firstKb.id;
        } else {
          targetKnowledgeBaseId = defaultKb.id;
        }
      }

      const extractionId = `ext-${uuidv4().split('-')[0]}`;
      
      // 异步启动提取任务（不阻塞响应）
      startExtractionTask(itemIds, targetKnowledgeBaseId, extractionId, userApiKey, extractionOptions)
        .catch(error => {
          console.error('启动提取任务失败:', error);
        });

      // 立即返回提取任务ID
      return createSuccessResponse({
        data: {
          extractionId,
          status: 'processing',
          totalItems: itemIds.length,
          processedItems: 0,
          extractedCount: 0
        }
      });
    }

    // GET /api/knowledge/extract/:extractionId/status - 获取提取状态
    if (method === 'GET' && path.startsWith('/extract/') && path.endsWith('/status')) {
      const extractionId = path.replace('/extract/', '').replace('/status', '');
      
      const { data: task, error } = await db.client
        .from('extraction_tasks')
        .select('*')
        .eq('id', extractionId)
        .single();

      if (error || !task) {
        if (error && error.code === 'PGRST116') {
          return createErrorResponse(404, '提取任务不存在');
        }
        throw error;
      }

      // 解析 JSON 字段
      const knowledgeItemIds = task.knowledge_item_ids ? JSON.parse(task.knowledge_item_ids) : [];
      const knowledgeItems = task.knowledge_items ? JSON.parse(task.knowledge_items) : [];
      const progressHistory = task.progress_history ? JSON.parse(task.progress_history) : [];
      
      // 计算进度
      const progress = task.progress !== undefined 
        ? task.progress
        : (task.total_items > 0 
            ? Math.round((task.processed_items / task.total_items) * 100)
            : 0);

      // 计算 ETA
      const etaSeconds = task.status === 'processing' && progressHistory.length > 0
        ? calculateETA(progressHistory, progress, task.start_time || Date.now())
        : null;

      const responseData = {
        status: task.status,
        stage: task.stage || 'extracting',
        totalItems: task.total_items || 0,
        processedItems: task.processed_items || 0,
        extractedCount: task.extracted_count || 0,
        currentDocIndex: task.current_doc_index || 0,
        knowledgeItems: knowledgeItems || [],
        knowledgeItemIds: knowledgeItemIds || [],
        progress: progress,
        etaSeconds: etaSeconds
      };

      // 如果任务失败，包含错误信息
      if (task.status === 'failed') {
        responseData.error = task.error || '提取任务失败';
        if (task.error_details) {
          try {
            responseData.errorDetails = JSON.parse(task.error_details);
          } catch (e) {
            responseData.errorDetails = { message: task.error_details };
          }
        }
      }

      return createSuccessResponse({
        data: responseData
      });
    }

    // GET /api/knowledge/items - 获取知识列表
    if (method === 'GET' && path === '/items') {
      console.log('[Knowledge Function] 获取知识列表，查询参数:', event.queryStringParameters);
      const queryParams = event.queryStringParameters || {};
      const {
        knowledgeBaseId,
        status,
        category,
        tags,
        search,
        page = 1,
        limit = 50
      } = queryParams;

      try {
        // 先获取总数
        let countQuery = db.client
          .from('personal_knowledge_items')
          .select('*', { count: 'exact', head: true });

        // 应用过滤条件（用于计数）
        if (knowledgeBaseId) {
          countQuery = countQuery.eq('knowledge_base_id', knowledgeBaseId);
        }
        if (status && status !== 'all') {
          countQuery = countQuery.eq('status', status);
        }
        if (category) {
          countQuery = countQuery.eq('category', category);
        }
        if (search) {
          countQuery = countQuery.ilike('title', `%${search}%`);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        // 构建数据查询（包含子分类）
        let query = db.client
          .from('personal_knowledge_items')
          .select(`
            *,
            category_subcategories (
              id,
              category,
              name,
              keywords
            )
          `);

        // 应用过滤条件
        if (knowledgeBaseId) {
          query = query.eq('knowledge_base_id', knowledgeBaseId);
        }
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }
        if (category) {
          query = query.eq('category', category);
        }
        if (tags) {
          const tagList = tags.split(',').map(t => t.trim());
          // Supabase JSONB 查询：使用 contains 检查数组是否包含值
          tagList.forEach(tag => {
            query = query.contains('tags', [tag]);
          });
        }
        if (search) {
          query = query.ilike('title', `%${search}%`);
        }

        // 排序和分页
        query = query
          .order('created_at', { ascending: false })
          .range(
            (parseInt(page) - 1) * parseInt(limit),
            parseInt(page) * parseInt(limit) - 1
          );

        const { data: items, error } = await query;

        if (error) throw error;

        // 解析 JSON 字段并处理子分类
        const itemsWithParsed = (items || []).map((item) => {
          const tags = typeof item.tags === 'string' ? JSON.parse(item.tags || '[]') : (item.tags || []);
          const category = item.category || 'work';
          
          // 处理子分类（Supabase 返回的是数组）
          let subcategory = null;
          if (item.category_subcategories && Array.isArray(item.category_subcategories) && item.category_subcategories.length > 0) {
            const subcat = item.category_subcategories[0];
            subcategory = {
              id: subcat.id,
              name: subcat.name,
              keywords: typeof subcat.keywords === 'string' ? JSON.parse(subcat.keywords || '[]') : (subcat.keywords || [])
            };
          }

          // 清理数据
          const { category_subcategories, ...cleanItem } = item;

          return {
            ...cleanItem,
            tags,
            keyConclusions: typeof cleanItem.key_conclusions === 'string' ? JSON.parse(cleanItem.key_conclusions || '[]') : (cleanItem.key_conclusions || []),
            metadata: cleanItem.metadata ? (typeof cleanItem.metadata === 'string' ? JSON.parse(cleanItem.metadata) : cleanItem.metadata) : {},
            category,
            subcategory_id: cleanItem.subcategory_id || null,
            subcategory
          };
        });

        return createSuccessResponse({
          data: itemsWithParsed,
          total: count || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: (parseInt(page) * parseInt(limit)) < (count || 0)
        });
      } catch (error) {
        console.error('获取知识列表失败:', error);
        return createErrorResponse(500, error.message || '获取知识列表失败');
      }
    }

    // 其他路由暂不支持
    return createErrorResponse(404, '路由不存在');
  } catch (error) {
    console.error('Knowledge API error:', error);
    return createErrorResponse(500, error.message || '服务器内部错误');
  }
};

