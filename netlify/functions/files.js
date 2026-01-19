// Files API - 从 Supabase Storage 提供 PDF 文件
const db = require('./utils/db');
const { createSuccessResponse, createErrorResponse, handleOptions } = require('./utils/helpers');

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // 从路径中提取文件 ID
  let path = event.path;
  if (path.startsWith('/.netlify/functions/files')) {
    path = path.replace('/.netlify/functions/files', '');
  } else if (path.startsWith('/api/files')) {
    path = path.replace('/api/files', '');
  }

  // 匹配 /pdf/:id 路径
  const pdfMatch = path.match(/^\/pdf\/(.+)$/);
  
  if (!pdfMatch) {
    return createErrorResponse(404, '路径不正确');
  }

  const fileId = pdfMatch[1];

  try {
    // 从数据库获取文件信息
    const { data: item, error } = await db.client
      .from('source_items')
      .select('id, type, file_path, title')
      .eq('id', fileId)
      .single();

    if (error || !item) {
      console.error('PDF文件请求失败：文档不存在，ID:', fileId, error);
      return createErrorResponse(404, '文档不存在');
    }

    if (item.type !== 'pdf') {
      return createErrorResponse(400, '该文档不是PDF类型');
    }

    if (!item.file_path) {
      console.error('PDF文件请求失败：文件路径为空，ID:', fileId);
      return createErrorResponse(404, 'PDF文件不存在');
    }

    // file_path 应该是 Supabase Storage 的 URL
    // 格式可能是：https://xxx.supabase.co/storage/v1/object/public/uploads/xxx.pdf
    // 或者只是路径：uploads/xxx.pdf
    
    let fileUrl = item.file_path;
    
    // 如果不是完整 URL，构建 Supabase Storage 公共 URL
    if (!fileUrl.startsWith('http')) {
      const supabaseUrl = process.env.SUPABASE_URL;
      if (!supabaseUrl) {
        return createErrorResponse(500, 'Supabase URL 未配置');
      }
      
      // 移除开头的斜杠（如果有）
      const cleanPath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
      fileUrl = `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;
    }

    console.log('获取PDF文件:', { id: fileId, fileUrl });

    // 从 Supabase Storage 获取文件
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      console.error('从 Supabase Storage 获取文件失败:', response.status, response.statusText);
      return createErrorResponse(404, 'PDF文件不存在或无法访问');
    }

    // 获取文件内容
    const fileBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/pdf';

    // 设置响应头
    const headers = {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${item.title || 'document'}.pdf"`,
      'Cache-Control': 'public, max-age=3600', // 1小时缓存
      'Access-Control-Allow-Origin': '*',
    };

    // 支持 Range 请求（用于 PDF.js 的分块加载）
    const range = event.headers.range;
    if (range) {
      const fileSize = fileBuffer.byteLength;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const chunk = fileBuffer.slice(start, end + 1);

      return {
        statusCode: 206,
        headers: {
          ...headers,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
        },
        body: Buffer.from(chunk).toString('base64'),
        isBase64Encoded: true,
      };
    }

    // 完整文件响应
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Length': fileBuffer.byteLength.toString(),
      },
      body: Buffer.from(fileBuffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('获取PDF文件失败:', error);
    return createErrorResponse(500, error.message || '获取PDF文件失败');
  }
};

