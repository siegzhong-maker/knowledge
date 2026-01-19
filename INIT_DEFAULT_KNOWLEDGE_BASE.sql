-- 初始化十步创业知识库
-- 在 Supabase SQL Editor 中执行此脚本

-- 创建"十步创业"知识库（作为默认知识库）
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
  '十步创业',
  '十步创业知识库 - 6步18关创业知识体系',
  'rocket',
  '#6366f1',
  true,
  EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT,
  EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT
)
ON CONFLICT (id) DO UPDATE SET
  name = '十步创业',
  description = '十步创业知识库 - 6步18关创业知识体系',
  is_default = true,
  updated_at = EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT;

-- 验证：查看创建的默认知识库
SELECT * FROM knowledge_bases WHERE is_default = true;

