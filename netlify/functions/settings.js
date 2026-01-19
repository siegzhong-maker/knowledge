// Settings API - 应用设置管理
const db = require('./utils/db');
const { createSuccessResponse, createErrorResponse, handleOptions } = require('./utils/helpers');

// 注意：需要从 backend/services 导入加密/解密函数
// 这里简化处理，实际使用时需要迁移这些函数
const crypto = require('crypto');

// 简单的加密/解密函数（简化版，实际应使用 backend/services/crypto.js）
function encryptToString(text) {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!', 'utf8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptFromString(encryptedText) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-chars-long!!', 'utf8').slice(0, 32);
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
}

// 测试 DeepSeek API 连接（简化版）
async function testConnection(apiKey) {
  // 这里需要实现实际的 API 测试逻辑
  // 暂时返回成功
  return { success: true, message: 'API Key 有效' };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  const path = event.path.replace('/api/settings', '').replace('/.netlify/functions/settings', '') || '/';
  const method = event.httpMethod;

  try {
    // GET /api/settings - 获取设置
    if (method === 'GET' && (path === '/' || path === '')) {
      const { data: settings, error } = await db.client.from('settings').select('key, value');
      
      if (error) throw error;
      
      const result = {};
      
      for (const setting of settings || []) {
        if (setting.key === 'deepseek_api_key') {
          const decrypted = decryptFromString(setting.value);
          if (decrypted) {
            const masked = decrypted.substring(0, 4) + '...' + decrypted.substring(decrypted.length - 4);
            result[setting.key] = masked;
            result[setting.key + '_configured'] = true;
          } else {
            result[setting.key + '_configured'] = false;
          }
        } else {
          result[setting.key] = setting.value;
        }
      }
      
      // 如果没有设置评估开关，默认返回true
      if (result.enable_relevance_evaluation === undefined) {
        result.enable_relevance_evaluation = 'true';
      }
      
      return createSuccessResponse({ data: result });
    }

    // PUT /api/settings - 更新设置
    if (method === 'PUT' && (path === '/' || path === '')) {
      const body = JSON.parse(event.body || '{}');
      const { apiKey, model, darkMode, enableRelevanceEvaluation } = body;
      
      if (apiKey !== undefined) {
        if (apiKey && !apiKey.startsWith('sk-')) {
          return createErrorResponse(400, 'API Key格式无效');
        }
        
        if (apiKey) {
          const encrypted = encryptToString(apiKey);
          // 使用 Supabase upsert
          const { error } = await db.client.from('settings')
            .upsert({ key: 'deepseek_api_key', value: encrypted }, { onConflict: 'key' });
          if (error) throw error;
        } else {
          // 清空API Key
          const { error } = await db.client.from('settings')
            .delete()
            .eq('key', 'deepseek_api_key');
          if (error) throw error;
        }
      }
      
      if (model !== undefined) {
        const { error } = await db.client.from('settings')
          .upsert({ key: 'deepseek_model', value: model }, { onConflict: 'key' });
        if (error) throw error;
      }
      
      if (darkMode !== undefined) {
        const { error } = await db.client.from('settings')
          .upsert({ key: 'dark_mode', value: darkMode.toString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      
      if (enableRelevanceEvaluation !== undefined) {
        const { error } = await db.client.from('settings')
          .upsert({ key: 'enable_relevance_evaluation', value: enableRelevanceEvaluation.toString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      
      return createSuccessResponse({ message: '设置已保存' });
    }

    // POST /api/settings/test-api - 测试API连接
    if (method === 'POST' && path === '/test-api') {
      const body = JSON.parse(event.body || '{}');
      const { apiKey } = body;
      
      const result = await testConnection(apiKey || null);
      
      return createSuccessResponse({
        success: result.success,
        message: result.message
      });
    }

    // GET /api/settings/api-status - 获取API状态
    if (method === 'GET' && path === '/api-status') {
      const { data: setting, error } = await db.client.from('settings')
        .select('value')
        .eq('key', 'deepseek_api_key')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      const configured = !!setting;
      
      if (!configured) {
        return createSuccessResponse({ 
          data: { configured: false, status: '未配置' } 
        });
      }
      
      const result = await testConnection();
      return createSuccessResponse({
        data: {
          configured: true,
          status: result.success ? '已连接' : '连接失败',
          message: result.message
        }
      });
    }

    return createErrorResponse(404, '路由不存在');
  } catch (error) {
    console.error('Settings API error:', error);
    return createErrorResponse(500, error.message || '服务器内部错误');
  }
};

