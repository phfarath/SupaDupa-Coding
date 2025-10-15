-- Tabela de registros de memória conforme especificação
-- Colunas: record_id, agent_origin, embedding_vector

CREATE TABLE IF NOT EXISTS memory_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT UNIQUE NOT NULL,
  key TEXT NOT NULL,
  category TEXT NOT NULL,
  data TEXT NOT NULL,
  agent_origin TEXT NOT NULL,
  embedding_vector TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de permissões para compartilhamento entre agentes
CREATE TABLE IF NOT EXISTS memory_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  permissions TEXT NOT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  granted_by TEXT NOT NULL,
  UNIQUE(record_id, agent_id)
);

-- Índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_memory_records_key ON memory_records(key);
CREATE INDEX IF NOT EXISTS idx_memory_records_category ON memory_records(category);
CREATE INDEX IF NOT EXISTS idx_memory_records_agent_origin ON memory_records(agent_origin);
CREATE INDEX IF NOT EXISTS idx_memory_records_created_at ON memory_records(created_at);

-- Índices para permissões
CREATE INDEX IF NOT EXISTS idx_memory_permissions_agent_id ON memory_permissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_permissions_record_id ON memory_permissions(record_id);