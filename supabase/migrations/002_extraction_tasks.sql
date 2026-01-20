-- 创建提取任务状态表
-- 用于存储知识提取任务的状态，替代内存 Map（因为 Netlify Functions 是无状态的）

CREATE TABLE IF NOT EXISTS extraction_tasks (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'processing',
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  extracted_count INTEGER DEFAULT 0,
  knowledge_item_ids JSONB DEFAULT '[]'::jsonb,
  knowledge_items JSONB DEFAULT '[]'::jsonb,
  stage TEXT DEFAULT 'parsing',
  progress INTEGER DEFAULT 0,
  current_doc_index INTEGER DEFAULT 0,
  error TEXT,
  error_details JSONB,
  progress_history JSONB DEFAULT '[]'::jsonb,
  start_time BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_extraction_tasks_status ON extraction_tasks(status);
CREATE INDEX IF NOT EXISTS idx_extraction_tasks_created_at ON extraction_tasks(created_at DESC);

-- 添加注释
COMMENT ON TABLE extraction_tasks IS '存储知识提取任务的状态信息';
COMMENT ON COLUMN extraction_tasks.id IS '提取任务ID，格式：ext-xxxxx';
COMMENT ON COLUMN extraction_tasks.status IS '任务状态：processing, completed, failed';
COMMENT ON COLUMN extraction_tasks.stage IS '当前阶段：parsing, extracting, summarizing, saving, completed, failed';
COMMENT ON COLUMN extraction_tasks.progress IS '进度百分比（0-100）';
COMMENT ON COLUMN extraction_tasks.knowledge_item_ids IS '已提取的知识点ID数组（JSONB）';
COMMENT ON COLUMN extraction_tasks.knowledge_items IS '已提取的知识点详情数组（JSONB，用于前端显示）';
COMMENT ON COLUMN extraction_tasks.progress_history IS '进度历史记录，用于计算ETA（JSONB数组）';

