// 返回 Supabase 配置（仅返回公开信息）
// 注意：只返回 URL 和 anon key，不返回 service_role key

const { createSuccessResponse, createErrorResponse, handleOptions } = require('./utils/helpers');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'GET') {
    return createErrorResponse(405, 'Method not allowed');
  }

  try {
    // 从环境变量获取配置
    const supabaseUrl = process.env.SUPABASE_URL;
    
    // 注意：anon key 需要单独配置，或者从 Supabase Dashboard 获取
    // 这里返回 URL，anon key 需要在前端配置或通过其他方式获取
    // 为了安全，service_role key 不应该返回给前端
    
    return createSuccessResponse({
      url: supabaseUrl || 'https://qrpexoehzbdfbzgzvwsc.supabase.co',
      // anon key 应该从前端配置或 Supabase Dashboard 获取
      // 这里不返回，避免安全问题
      message: '请在前端配置 SUPABASE_ANON_KEY，或从 Supabase Dashboard > Settings > API 获取'
    });
  } catch (error) {
    console.error('Supabase config error:', error);
    return createErrorResponse(500, error.message || '服务器内部错误');
  }
};

