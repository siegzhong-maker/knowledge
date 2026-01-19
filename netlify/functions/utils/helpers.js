// 共享工具函数

// 解析查询字符串参数
exports.parseQueryParams = (queryString) => {
  const params = {};
  if (queryString) {
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });
  }
  return params;
};

// 从路径中提取 ID
exports.extractIdFromPath = (path, prefix = '/') => {
  const parts = path.split('/').filter(p => p);
  return parts[parts.length - 1] || null;
};

// 标准 CORS 头
exports.corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// 标准响应格式
exports.createResponse = (statusCode, data, headers = {}) => {
  return {
    statusCode,
    headers: {
      ...exports.corsHeaders,
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(data)
  };
};

// 错误响应
exports.createErrorResponse = (statusCode, message, error = null) => {
  return exports.createResponse(statusCode, {
    success: false,
    message,
    ...(error && process.env.NODE_ENV === 'development' ? { error: error.message } : {})
  });
};

// 成功响应
exports.createSuccessResponse = (data, statusCode = 200) => {
  return exports.createResponse(statusCode, {
    success: true,
    ...(typeof data === 'object' && !Array.isArray(data) ? data : { data })
  });
};

// 处理 OPTIONS 请求
exports.handleOptions = () => {
  return {
    statusCode: 200,
    headers: exports.corsHeaders,
    body: ''
  };
};

