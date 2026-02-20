-- Adicionar coluna motivo_saida na tabela estadias
-- Executar este script para atualizar o banco de dados

-- Criar o tipo enum para motivo_saida
DO $$ BEGIN
    CREATE TYPE motivo_saida_enum AS ENUM (
        'voluntario',
        'automatico', 
        'abandono',
        'transferencia',
        'encaminhamento',
        'descumprimento',
        'outro'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Adicionar coluna motivo_saida
ALTER TABLE estadias 
ADD COLUMN IF NOT EXISTS motivo_saida motivo_saida_enum;

-- Atualizar o tipo enum de status para incluir novos valores
-- Primeiro, criar um novo tipo com todos os valores
DO $$ BEGIN
    -- Adicionar novos valores ao enum existente
    ALTER TYPE statusestadia ADD VALUE IF NOT EXISTS 'abandono';
    ALTER TYPE statusestadia ADD VALUE IF NOT EXISTS 'checkout_automatico';
EXCEPTION
    WHEN others THEN null;
END $$;

-- Atualizar estadias antigas que não têm motivo_saida
UPDATE estadias 
SET motivo_saida = 'voluntario' 
WHERE status = 'finalizada' AND motivo_saida IS NULL;

-- Comentário para facilitar entendimento
COMMENT ON COLUMN estadias.motivo_saida IS 'Motivo pelo qual a estadia foi encerrada: voluntario, automatico, abandono, transferencia, encaminhamento, descumprimento, outro';
