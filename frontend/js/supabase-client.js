// Supabase 客户端配置
// 注意：前端使用 anon key，不是 service_role key

// 从环境变量或配置获取 Supabase 信息
const SUPABASE_URL = window.SUPABASE_URL || 'https://qrpexoehzbdfbzgzvwsc.supabase.co';
let SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || null;

// 动态加载 Supabase 客户端
let supabaseClient = null;

export async function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  // 检查 anon key
  const anonKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  
  if (!anonKey) {
    // 尝试从 API 获取配置
    try {
      const response = await fetch('/api/settings/supabase-config');
      const data = await response.json();
      if (data.success && data.data && data.data.anonKey) {
        window.SUPABASE_ANON_KEY = data.data.anonKey;
        SUPABASE_ANON_KEY = data.data.anonKey;
      }
    } catch (error) {
      console.warn('无法从 API 获取 Supabase 配置');
    }
  }

  // 如果还是没有 anon key，抛出清晰的错误
  const finalAnonKey = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
  if (!finalAnonKey) {
    throw new Error(
      'Supabase anon key 未配置。\n\n' +
      '请按以下步骤配置：\n' +
      '1. 访问 Supabase Dashboard > Settings > API\n' +
      '2. 复制 "anon" "public" key\n' +
      '3. 在 frontend/index.html 中配置：window.SUPABASE_ANON_KEY = "您的 anon key"\n\n' +
      '或者查看 SUPABASE_ANON_KEY_SETUP.md 获取详细说明。'
    );
  }

  // 动态导入 Supabase 客户端
  if (typeof window.supabase === 'undefined') {
    await loadSupabaseScript();
  }

  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL || SUPABASE_URL,
      finalAnonKey
    );
    return supabaseClient;
  }

  throw new Error('Supabase 客户端未加载，请检查 Supabase JS 库是否正确加载');
}

// 动态加载 Supabase JS 库
function loadSupabaseScript() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = () => {
      if (window.supabase) {
        resolve();
      } else {
        reject(new Error('Supabase 库加载失败'));
      }
    };
    script.onerror = () => reject(new Error('无法加载 Supabase 库'));
    document.head.appendChild(script);
  });
}

// 上传文件到 Supabase Storage
export async function uploadFileToStorage(file, bucketName = 'uploads') {
  try {
    const supabase = await getSupabaseClient();
    
    // 生成唯一文件名
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    // 上传文件
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: urlData.publicUrl,
      fileName: file.name
    };
  } catch (error) {
    console.error('Supabase Storage 上传失败:', error);
    throw new Error(`文件上传失败: ${error.message}`);
  }
}

