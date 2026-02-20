-- Migration: Adicionar colunas para liberação antecipada de bloqueios
-- Data: 2025-12-26
-- Descrição: Adiciona suporte para liberação antecipada de bloqueios e tipo abandono

-- Adicionar colunas na tabela bloqueios
ALTER TABLE bloqueios ADD COLUMN IF NOT EXISTS liberacao_antecipada BOOLEAN DEFAULT false;
ALTER TABLE bloqueios ADD COLUMN IF NOT EXISTS data_liberacao_antecipada TIMESTAMP;
ALTER TABLE bloqueios ADD COLUMN IF NOT EXISTS funcionario_liberacao VARCHAR(255);
ALTER TABLE bloqueios ADD COLUMN IF NOT EXISTS observacoes_liberacao TEXT;

-- Adicionar valor 'abandono' ao enum de tipo de bloqueio (se não existir)
DO $$ BEGIN
    ALTER TYPE tipobloqueio ADD VALUE IF NOT EXISTS 'abandono';
EXCEPTION
    WHEN undefined_object THEN
        -- Se o tipo não existe, cria o enum completo
        CREATE TYPE tipobloqueio AS ENUM ('tempo_maximo', 'comportamento', 'administrativo', 'abandono');
END $$;

-- Comentários
COMMENT ON COLUMN bloqueios.liberacao_antecipada IS 'Indica se o bloqueio foi liberado antes do prazo';
COMMENT ON COLUMN bloqueios.data_liberacao_antecipada IS 'Data em que o bloqueio foi liberado antecipadamente';
COMMENT ON COLUMN bloqueios.funcionario_liberacao IS 'Funcionário que liberou o bloqueio antecipadamente';
COMMENT ON COLUMN bloqueios.observacoes_liberacao IS 'Observações sobre a liberação antecipada';
