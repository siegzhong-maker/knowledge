-- Supabase 数据库初始化脚本
-- 基于原有 SQLite/PostgreSQL schema 创建

-- source_items 表
CREATE TABLE IF NOT EXISTS source_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('text', 'link', 'memo', 'pdf')),
  title TEXT NOT NULL,
  raw_content TEXT,
  original_url TEXT,
  summary_ai TEXT,
  source TEXT,
  tags TEXT DEFAULT '[]',
  file_path TEXT,
  page_count INTEGER,
  page_content TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed', 'archived')),
  knowledge_base_id TEXT,
  module_id TEXT,
  knowledge_extracted BOOLEAN DEFAULT FALSE
);

-- tags 表
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  count INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL
);

-- settings 表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- user_contexts 表
CREATE TABLE IF NOT EXISTS user_contexts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  context_data TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL
);

-- knowledge_bases 表
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'book',
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- modules 表
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  knowledge_base_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  checkpoint_number INTEGER,
  checkpoint_name TEXT,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at BIGINT NOT NULL
);

-- personal_knowledge_items 表
CREATE TABLE IF NOT EXISTS personal_knowledge_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  key_conclusions TEXT DEFAULT '[]',
  source_item_id TEXT,
  source_page INTEGER,
  source_excerpt TEXT,
  confidence_score REAL DEFAULT 0,
  status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'pending', 'archived')),
  category TEXT,
  subcategory_id TEXT,
  tags TEXT DEFAULT '[]',
  knowledge_base_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata TEXT
);

-- knowledge_relations 表
CREATE TABLE IF NOT EXISTS knowledge_relations (
  id TEXT PRIMARY KEY,
  source_knowledge_id TEXT NOT NULL,
  target_knowledge_id TEXT NOT NULL,
  relation_type TEXT DEFAULT 'related' CHECK(relation_type IN ('related', 'similar', 'derived')),
  similarity_score REAL DEFAULT 0,
  created_at BIGINT NOT NULL
);

-- category_subcategories 表
CREATE TABLE IF NOT EXISTS category_subcategories (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN ('work', 'learning', 'leisure', 'life')),
  name TEXT NOT NULL,
  keywords TEXT DEFAULT '[]',
  order_index INTEGER DEFAULT 0,
  is_custom INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE(category, name)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_items_type ON source_items(type);
CREATE INDEX IF NOT EXISTS idx_items_status ON source_items(status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON source_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_knowledge_base_id ON source_items(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_items_kb_status_created ON source_items(knowledge_base_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_type_status ON source_items(type, status);
CREATE INDEX IF NOT EXISTS idx_items_status_created ON source_items(status, created_at DESC) WHERE status != 'archived';

CREATE INDEX IF NOT EXISTS idx_knowledge_items_knowledge_base_id ON personal_knowledge_items(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_source_item_id ON personal_knowledge_items(source_item_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_status ON personal_knowledge_items(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_created_at ON personal_knowledge_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_subcategory ON personal_knowledge_items(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_kb_status_created ON personal_knowledge_items(knowledge_base_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_category_status ON personal_knowledge_items(category, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_status_created ON personal_knowledge_items(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- 启用 Row Level Security (RLS) - 根据需要配置
-- ALTER TABLE source_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE personal_knowledge_items ENABLE ROW LEVEL SECURITY;

