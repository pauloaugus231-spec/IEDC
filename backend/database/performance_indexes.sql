-- ============================================
-- ÍNDICES DE PERFORMANCE PARA 13 MIL CADASTROS
-- Sistema: Albergue Dias da Cruz
-- Data: 09/01/2026
-- ============================================

-- IMPORTANTE: Este script é idempotente (pode ser executado múltiplas vezes)
-- Uso: psql -U postgres -d albergue -f backend/database/performance_indexes.sql

BEGIN;

-- ============================================
-- INSTALAR EXTENSÕES NECESSÁRIAS
-- ============================================

-- Extensão para busca full-text com trigrams (similaridade)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- PESSOAS (tabela principal - maior impacto)
-- ============================================

-- Índice para filtrar por status e ativo (usado em listagens)
CREATE INDEX IF NOT EXISTS idx_pessoas_ativo_status 
ON pessoas(ativo, status_cadastro);

-- Índice para busca por nome (full-text search em português)
CREATE INDEX IF NOT EXISTS idx_pessoas_nome_trgm 
ON pessoas USING gin(nome gin_trgm_ops);

-- Índice para busca por CPF
CREATE INDEX IF NOT EXISTS idx_pessoas_cpf 
ON pessoas(cpf) WHERE cpf IS NOT NULL;

-- Índice para ordenação por data de cadastro
CREATE INDEX IF NOT EXISTS idx_pessoas_created_at 
ON pessoas(created_at DESC);

-- Índice para pessoas LGBT (filtro específico)
CREATE INDEX IF NOT EXISTS idx_pessoas_lgbt 
ON pessoas(lgbt) WHERE lgbt = true;

-- ============================================
-- ESTADIAS (queries frequentes)
-- ============================================

-- Índice para buscar estadias de uma pessoa
CREATE INDEX IF NOT EXISTS idx_estadias_pessoa 
ON estadias(pessoa_id);

-- Índice para estadias ativas
CREATE INDEX IF NOT EXISTS idx_estadias_status 
ON estadias(status) WHERE status = 'ativa';

-- Índice para buscar por cama
CREATE INDEX IF NOT EXISTS idx_estadias_cama 
ON estadias(cama_id);

-- Índice composto para checkout automático (data_limite + status)
CREATE INDEX IF NOT EXISTS idx_estadias_ativa_limite 
ON estadias(status, data_limite) WHERE status = 'ativa';

-- Índice para ordenação por data de checkin
CREATE INDEX IF NOT EXISTS idx_estadias_checkin 
ON estadias(data_checkin DESC);

-- ============================================
-- BLOQUEIOS (verificações rápidas)
-- ============================================

-- Índice para buscar bloqueios de uma pessoa
CREATE INDEX IF NOT EXISTS idx_bloqueios_pessoa 
ON bloqueios(pessoa_id);

-- Índice para bloqueios ativos
CREATE INDEX IF NOT EXISTS idx_bloqueios_ativo 
ON bloqueios(ativo) WHERE ativo = true;

-- Índice composto para verificar se pessoa está bloqueada
CREATE INDEX IF NOT EXISTS idx_bloqueios_pessoa_ativo 
ON bloqueios(pessoa_id, ativo) WHERE ativo = true;

-- Índice para buscar bloqueios que expiram hoje
CREATE INDEX IF NOT EXISTS idx_bloqueios_data_fim 
ON bloqueios(data_fim) WHERE ativo = true AND data_fim IS NOT NULL;

-- Índice para liberações antecipadas
CREATE INDEX IF NOT EXISTS idx_bloqueios_liberacao 
ON bloqueios(liberacao_antecipada) WHERE liberacao_antecipada = true;

-- ============================================
-- OCORRENCIAS (histórico)
-- ============================================

-- Índice para buscar ocorrências de uma pessoa
CREATE INDEX IF NOT EXISTS idx_ocorrencias_pessoa 
ON ocorrencias(pessoa_id);

-- Índice para ordenação por data (mais recentes primeiro)
CREATE INDEX IF NOT EXISTS idx_ocorrencias_data 
ON ocorrencias(data_ocorrencia DESC);

-- Índice para filtrar por tipo
CREATE INDEX IF NOT EXISTS idx_ocorrencias_tipo 
ON ocorrencias(tipo);

-- Índice para filtrar por severidade
CREATE INDEX IF NOT EXISTS idx_ocorrencias_severidade 
ON ocorrencias(severidade);

-- ============================================
-- CAMAS (disponibilidade rápida)
-- ============================================

-- Índice para buscar camas por status
CREATE INDEX IF NOT EXISTS idx_camas_status 
ON camas(status);

-- Índice para buscar camas por casa
CREATE INDEX IF NOT EXISTS idx_camas_casa 
ON camas(casa);

-- Índice composto para dashboard (casa + status)
CREATE INDEX IF NOT EXISTS idx_camas_casa_status 
ON camas(casa, status);

-- ============================================
-- SOLICITACOES (triagem rápida)
-- ============================================

-- Índice para buscar solicitações por status
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status 
ON solicitacoes(status);

-- Índice para ordenação por data de solicitação
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data 
ON solicitacoes(data_solicitacao DESC);

-- Índice para buscar solicitações de uma pessoa
CREATE INDEX IF NOT EXISTS idx_solicitacoes_pessoa 
ON solicitacoes(pessoa_id);

-- ============================================
-- ATUALIZAR ESTATÍSTICAS DO OTIMIZADOR
-- ============================================

-- Atualizar estatísticas para o otimizador usar os índices corretamente
ANALYZE pessoas;
ANALYZE estadias;
ANALYZE bloqueios;
ANALYZE ocorrencias;
ANALYZE camas;
ANALYZE solicitacoes;

COMMIT;

-- ============================================
-- VERIFICAR ÍNDICES CRIADOS
-- ============================================

-- Execute esta query para ver todos os índices:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- ============================================
-- MONITORAMENTO DE ÍNDICES
-- ============================================

-- Ver se índices estão sendo utilizados:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as "Vezes Usado",
--   idx_tup_read as "Tuplas Lidas",
--   idx_tup_fetch as "Tuplas Buscadas"
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ✅ Script concluído com sucesso!
