-- ============================================
-- MIGRAÇÃO: MÓDULO PRONTUÁRIOS
-- Data: 13/01/2026
-- ============================================

-- Criar ENUM para tipo de prontuário
CREATE TYPE tipo_prontuario AS ENUM (
  'atendimento_social',
  'espaco_cuidados',
  'ocorrencia',
  'acompanhamento',
  'outro'
);

-- Criar ENUM para status do prontuário
CREATE TYPE status_prontuario AS ENUM (
  'rascunho',
  'finalizado',
  'arquivado'
);

-- ============================================
-- TABELA: prontuarios
-- ============================================
CREATE TABLE IF NOT EXISTS prontuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relacionamentos
  pessoa_id UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  
  -- Tipo e Classificação
  tipo tipo_prontuario NOT NULL DEFAULT 'atendimento_social',
  status status_prontuario NOT NULL DEFAULT 'finalizado',
  
  -- Data e Responsáveis
  data_atendimento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  equipe TEXT[] NOT NULL DEFAULT '{}',
  profissional_responsavel TEXT,
  
  -- Conteúdo
  titulo TEXT NOT NULL,
  conteudo JSONB NOT NULL DEFAULT '{}',
  observacoes TEXT,
  
  -- Metadata
  criado_automaticamente BOOLEAN NOT NULL DEFAULT false,
  modulo_origem TEXT, -- 'espaco_cuidados', 'triagem', etc.
  referencia_externa UUID, -- ID da sessão, estadia, etc.
  
  -- Campos de controle
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_by TEXT
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_prontuarios_pessoa ON prontuarios(pessoa_id);
CREATE INDEX idx_prontuarios_tipo ON prontuarios(tipo);
CREATE INDEX idx_prontuarios_status ON prontuarios(status);
CREATE INDEX idx_prontuarios_data ON prontuarios(data_atendimento DESC);
CREATE INDEX idx_prontuarios_pessoa_data ON prontuarios(pessoa_id, data_atendimento DESC);
CREATE INDEX idx_prontuarios_modulo ON prontuarios(modulo_origem);
CREATE INDEX idx_prontuarios_referencia ON prontuarios(referencia_externa);

-- Índice GIN para busca no conteúdo JSONB
CREATE INDEX idx_prontuarios_conteudo_gin ON prontuarios USING gin(conteudo);

-- ============================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ============================================
CREATE TRIGGER update_prontuarios_updated_at 
  BEFORE UPDATE ON prontuarios 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS EXPLICATIVOS
-- ============================================
COMMENT ON TABLE prontuarios IS 'Prontuários de atendimentos e acompanhamentos das pessoas';
COMMENT ON COLUMN prontuarios.tipo IS 'Tipo de prontuário (atendimento_social, espaco_cuidados, ocorrencia, etc.)';
COMMENT ON COLUMN prontuarios.conteudo IS 'Conteúdo estruturado do prontuário em formato JSON';
COMMENT ON COLUMN prontuarios.criado_automaticamente IS 'true se foi criado por automação (ex: fim de atendimento Espaço Cuidados)';
COMMENT ON COLUMN prontuarios.modulo_origem IS 'Módulo do sistema que criou o prontuário';
COMMENT ON COLUMN prontuarios.referencia_externa IS 'ID da entidade relacionada (sessao_id, estadia_id, etc.)';

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'Migração concluída com sucesso!' as status;

-- Ver tabela criada
SELECT 
  schemaname,
  tablename 
FROM pg_tables 
WHERE tablename = 'prontuarios';

-- Ver índices criados
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE tablename = 'prontuarios'
ORDER BY indexname;
