-- 初始化十步创业的6步18关模块结构
-- 在 Supabase SQL Editor 中执行此脚本（在创建知识库之后执行）

-- 确保知识库已创建
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM knowledge_bases WHERE id = 'kb-default') THEN
    RAISE EXCEPTION '请先执行 INIT_DEFAULT_KNOWLEDGE_BASE.sql 创建知识库';
  END IF;
END $$;

-- 6步18关的模块数据
INSERT INTO modules (
  id,
  knowledge_base_id,
  step_number,
  step_name,
  checkpoint_number,
  checkpoint_name,
  description,
  order_index,
  created_at
) VALUES
  -- 第一步：选方向（4个关卡）
  ('mod-1-1', 'kb-default', 1, '选方向', 1, '找风口', '寻找市场趋势和机会', 1, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-1-2', 'kb-default', 1, '选方向', 2, '寻初心', '明确创业初心和使命', 2, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-1-3', 'kb-default', 1, '选方向', 3, '知优势', '识别自身优势和资源', 3, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-1-4', 'kb-default', 1, '选方向', 4, '搭班子', '组建核心团队', 4, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  
  -- 第二步：找合伙人（1个关卡）
  ('mod-2-1', 'kb-default', 2, '找合伙人', 1, '找合伙人', '寻找合适的合伙人', 5, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  
  -- 第三步：找用户（3个关卡）
  ('mod-3-1', 'kb-default', 3, '找用户', 1, '清晰画像', '明确目标用户画像', 6, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-3-2', 'kb-default', 3, '找用户', 2, '找准痛点', '识别用户真实痛点', 7, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-3-3', 'kb-default', 3, '找用户', 3, '选准差异', '确定差异化定位', 8, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  
  -- 第四步：创产品（3个关卡）
  ('mod-4-1', 'kb-default', 4, '创产品', 1, '创造价值', '创造核心用户价值', 9, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-4-2', 'kb-default', 4, '创产品', 2, '独特价值', '打造独特价值主张', 10, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-4-3', 'kb-default', 4, '创产品', 3, '科学迭代', '建立科学迭代机制', 11, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  
  -- 第五步：营销1.0（3个关卡）
  ('mod-5-1', 'kb-default', 5, '营销1.0', 1, '销售漏斗', '构建销售转化漏斗', 12, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-5-2', 'kb-default', 5, '营销1.0', 2, '品类定位', '明确品类定位策略', 13, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-5-3', 'kb-default', 5, '营销1.0', 3, '维系罗盘', '建立客户维系体系', 14, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  
  -- 第六步：商业模式1.0（3个关卡）
  ('mod-6-1', 'kb-default', 6, '商业模式1.0', 1, '盈利模式', '设计可持续盈利模式', 15, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-6-2', 'kb-default', 6, '商业模式1.0', 2, '核心壁垒', '构建核心竞争壁垒', 16, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT),
  ('mod-6-3', 'kb-default', 6, '商业模式1.0', 3, '清晰式样', '明确商业模式样式', 17, EXTRACT(EPOCH FROM NOW()) * 1000::BIGINT)
ON CONFLICT (id) DO UPDATE SET
  step_name = EXCLUDED.step_name,
  checkpoint_name = EXCLUDED.checkpoint_name,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- 验证：查看创建的模块
SELECT 
  step_number,
  step_name,
  checkpoint_number,
  checkpoint_name,
  description
FROM modules 
WHERE knowledge_base_id = 'kb-default'
ORDER BY order_index;

