-- Migration: Adicionar tipo ABANDONO e campos de liberação antecipada nos bloqueios
-- Data: 2025-12-25

-- 1. Adicionar novo valor ao enum tipo_bloqueio (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'abandono' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tipo_bloqueio_enum')
    ) THEN
        ALTER TYPE tipo_bloqueio_enum ADD VALUE IF NOT EXISTS 'abandono';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Adicionar colunas de liberação antecipada na tabela bloqueios
ALTER TABLE bloqueios ADD COLUMN IF NOT EXISTS liberacao_antecipada BOOLEAN DEFAULT FALSE;
ALTER TABLE bloqueios ADD COLUMN IF NOT EXISTS data_liberacao_antecipada TIMESTAMP;
ALTER TABLE bloqueios ADD COLUMN IF NOT EXISTS motivo_liberacao_antecipada TEXT;
ALTER TABLE bloqueios ADD COLUMN IF NOT EXISTS liberado_por VARCHAR(100);

-- 3. Criar índice para busca de bloqueios ativos por pessoa
CREATE INDEX IF NOT EXISTS idx_bloqueios_pessoa_ativo ON bloqueios(pessoa_id, ativo);
CREATE INDEX IF NOT EXISTS idx_bloqueios_data_fim ON bloqueios(data_fim) WHERE ativo = true;

-- 4. Comentários nas colunas
COMMENT ON COLUMN bloqueios.liberacao_antecipada IS 'Indica se o bloqueio foi liberado antes do prazo';
COMMENT ON COLUMN bloqueios.data_liberacao_antecipada IS 'Data/hora da liberação antecipada';
COMMENT ON COLUMN bloqueios.motivo_liberacao_antecipada IS 'Motivo da liberação antecipada';
COMMENT ON COLUMN bloqueios.liberado_por IS 'Funcionário que autorizou a liberação antecipada';

-- Verificação
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bloqueios' 
ORDER BY ordinal_position;
