-- Script para prevenir duplicação de ocupação de camas
-- Este script adiciona uma constraint única para garantir que uma cama não pode ter duas estadias ativas

-- 1. Verificar se existem duplicações antes de criar a constraint
SELECT 
    cama_id,
    COUNT(*) as total,
    string_agg(e.id::text, ', ') as estadia_ids,
    string_agg(p.nome, ', ') as pessoas
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
WHERE e.status = 'ativa'
GROUP BY cama_id
HAVING COUNT(*) > 1;

-- 2. Criar índice único parcial para garantir que cada cama só pode ter uma estadia ativa
-- Este índice só considera estadias com status 'ativa'
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_estadia_per_cama
ON estadias (cama_id)
WHERE status = 'ativa';

-- 3. Adicionar comentário explicativo
COMMENT ON INDEX idx_unique_active_estadia_per_cama IS 
'Garante que cada cama pode ter apenas uma estadia ativa por vez, prevenindo duplicações';

-- 4. Verificar que o índice foi criado
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname = 'idx_unique_active_estadia_per_cama';
