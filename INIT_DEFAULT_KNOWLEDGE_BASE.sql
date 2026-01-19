-- 初始化默认知识库
-- 在 Supabase SQL Editor 中执行此脚本

-- 检查是否已存在默认知识库
DO $$
DECLARE
  default_kb_exists BOOLEAN;
BEGIN
  -- 检查是否存在默认知识库
  SELECT EXISTS (
    SELECT 1 FROM knowledge_bases WHERE is_default = true
  ) INTO default_kb_exists;
  
  -- 如果不存在，创建默认知识库
  IF NOT default_kb_exists THEN
    INSERT INTO knowledge_bases (
      id,
      name,
      description,
      icon,
      color,
      is_default,
      created_at,
      updated_at
    ) VALUES (
      'kb-default',
      '默认知识库',
      '系统默认知识库，用于存储所有文档和知识点',
      'book',
      '#6366f1',
      true,
      EXTRACT(EPOCH FROM NOW()) * 1000,
      EXTRACT(EPOCH FROM NOW()) * 1000
    );
    
    RAISE NOTICE '默认知识库已创建';
  ELSE
    RAISE NOTICE '默认知识库已存在，跳过创建';
  END IF;
END $$;

-- 验证
SELECT * FROM knowledge_bases WHERE is_default = true;

