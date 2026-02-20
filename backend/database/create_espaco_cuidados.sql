-- ============================================
-- MIGRAÇÃO: MÓDULO ESPAÇO DE CUIDADOS
-- Data: 12/01/2026
-- ============================================

-- Criar ENUM para status da sessão
CREATE TYPE status_sessao AS ENUM ('planejada', 'ativa', 'encerrada');

-- Criar ENUM para status da fila
CREATE TYPE status_fila_cuidados AS ENUM (
  'aguardando_banho',
  'em_banho',
  'aguardando_atendimento',
  'em_atendimento',
  'concluido',
  'desistiu'
);

-- ============================================
-- TABELA: sessoes_espaco_cuidados
-- ============================================
CREATE TABLE IF NOT EXISTS sessoes_espaco_cuidados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data_sessao DATE NOT NULL UNIQUE,
  status status_sessao NOT NULL DEFAULT 'planejada',
  hora_inicio TIMESTAMP,
  hora_fim TIMESTAMP,
  equipe TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_sessoes_espaco_status ON sessoes_espaco_cuidados(status);
CREATE INDEX idx_sessoes_espaco_data ON sessoes_espaco_cuidados(data_sessao DESC);

-- ============================================
-- TABELA: fila_espaco_cuidados
-- ============================================
CREATE TABLE IF NOT EXISTS fila_espaco_cuidados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relacionamentos
  sessao_id UUID NOT NULL REFERENCES sessoes_espaco_cuidados(id) ON DELETE CASCADE,
  pessoa_id UUID NOT NULL REFERENCES pessoas(id),
  
  -- Ordem e solicitações
  ordem_chegada INT NOT NULL,
  quer_banho BOOLEAN NOT NULL DEFAULT false,
  quer_atendimento BOOLEAN NOT NULL DEFAULT false,
  
  -- Posições nas filas específicas
  posicao_banho INT,
  posicao_atendimento INT,
  
  -- Status
  status status_fila_cuidados NOT NULL,
  
  -- Controle de "passar a vez"
  vezes_passou_vez INT NOT NULL DEFAULT 0,
  
  -- Horários - Banho
  hora_chegada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hora_inicio_banho TIMESTAMP,
  hora_fim_banho TIMESTAMP,
  
  -- Horários - Atendimento
  hora_inicio_atendimento TIMESTAMP,
  hora_fim_atendimento TIMESTAMP,
  
  -- Metadata
  novo_cadastro BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(sessao_id, pessoa_id),
  CHECK (quer_banho = true OR quer_atendimento = true)
);

-- Índices para performance
CREATE INDEX idx_fila_espaco_sessao ON fila_espaco_cuidados(sessao_id);
CREATE INDEX idx_fila_espaco_pessoa ON fila_espaco_cuidados(pessoa_id);
CREATE INDEX idx_fila_espaco_sessao_status ON fila_espaco_cuidados(sessao_id, status);
CREATE INDEX idx_fila_espaco_ordem ON fila_espaco_cuidados(sessao_id, ordem_chegada);
CREATE INDEX idx_fila_espaco_status ON fila_espaco_cuidados(status);

-- ============================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessoes_espaco_cuidados_updated_at 
  BEFORE UPDATE ON sessoes_espaco_cuidados 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fila_espaco_cuidados_updated_at 
  BEFORE UPDATE ON fila_espaco_cuidados 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS EXPLICATIVOS
-- ============================================
COMMENT ON TABLE sessoes_espaco_cuidados IS 'Sessões do Espaço de Cuidados (segundas-feiras 14h-18h)';
COMMENT ON TABLE fila_espaco_cuidados IS 'Fila de atendimento do Espaço de Cuidados (banho + atendimento social)';

COMMENT ON COLUMN fila_espaco_cuidados.ordem_chegada IS 'Ordem de chegada (1, 2, 3...) para priorização no atendimento';
COMMENT ON COLUMN fila_espaco_cuidados.posicao_banho IS 'Posição na fila específica de banho (null se não quer banho)';
COMMENT ON COLUMN fila_espaco_cuidados.posicao_atendimento IS 'Posição na fila de atendimento (null se ainda no banho ou não quer)';
COMMENT ON COLUMN fila_espaco_cuidados.vezes_passou_vez IS 'Contador de quantas vezes passou a vez (alerta após 3x)';
COMMENT ON COLUMN fila_espaco_cuidados.novo_cadastro IS 'true se a pessoa foi cadastrada hoje no sistema';

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'Migração concluída com sucesso!' as status;

-- Ver tabelas criadas
SELECT 
  schemaname,
  tablename 
FROM pg_tables 
WHERE tablename LIKE '%espaco%';

-- Ver índices criados
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE tablename LIKE '%espaco%'
ORDER BY tablename, indexname;
