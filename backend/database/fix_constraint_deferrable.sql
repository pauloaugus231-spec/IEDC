-- Script para testar se a constraint pode ser deferida (adiada)
-- PostgreSQL só permite DEFERRED em constraints criadas com DEFERRABLE

-- Verificar a constraint atual
SELECT conname, condeferrable, condeferred
FROM pg_constraint
WHERE conname = 'idx_unique_active_estadia_per_cama';

-- A constraint foi criada como ÍNDICE único, não como CONSTRAINT
-- Portanto, não pode ser deferida
-- Solução: Precisamos recriar como constraint deferrable

-- 1. Dropar o índice único atual
DROP INDEX IF EXISTS idx_unique_active_estadia_per_cama;

-- 2. Criar como constraint única deferrable
ALTER TABLE estadias 
ADD CONSTRAINT unique_active_estadia_per_cama 
UNIQUE (cama_id) 
DEFERRABLE INITIALLY IMMEDIATE
WHERE (status = 'ativa');

-- Verificar se foi criada corretamente
SELECT conname, condeferrable, condeferred
FROM pg_constraint
WHERE conname = 'unique_active_estadia_per_cama';
