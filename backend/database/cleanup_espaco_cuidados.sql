-- ============================================
-- SCRIPT DE LIMPEZA: REMOVER ESPAÇO DE CUIDADOS
-- Data: 13/01/2026
-- ============================================
-- ATENÇÃO: Este script remove TODAS as tabelas, tipos e dados
-- relacionados ao módulo Espaço de Cuidados
-- ============================================

-- Remover tabelas (CASCADE remove foreign keys)
DROP TABLE IF EXISTS fila_espaco_cuidados CASCADE;
DROP TABLE IF EXISTS sessoes_espaco_cuidados CASCADE;
DROP TABLE IF EXISTS prontuarios CASCADE;

-- Remover ENUMs
DROP TYPE IF EXISTS status_fila_cuidados CASCADE;
DROP TYPE IF EXISTS status_sessao CASCADE;
DROP TYPE IF EXISTS tipo_prontuario CASCADE;
DROP TYPE IF EXISTS status_prontuario CASCADE;

-- Verificação
SELECT 'Limpeza concluída com sucesso!' as status;

-- Verificar se as tabelas foram removidas
SELECT 
  schemaname,
  tablename 
FROM pg_tables 
WHERE tablename LIKE '%espaco%' 
   OR tablename LIKE '%prontuario%';

-- Se retornar vazio, significa que foi tudo removido ✅
