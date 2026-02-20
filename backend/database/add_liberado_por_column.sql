-- Migration: Adicionar coluna liberado_por na tabela bloqueios
-- Data: 09/01/2026
-- Motivo: Erro 500 ao tentar liberar pessoa antecipadamente - coluna não existia no banco

-- Adicionar coluna liberado_por se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bloqueios' 
        AND column_name = 'liberado_por'
    ) THEN
        ALTER TABLE bloqueios 
        ADD COLUMN liberado_por VARCHAR(100);
        
        RAISE NOTICE 'Coluna liberado_por adicionada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna liberado_por já existe';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'bloqueios'
AND column_name = 'liberado_por';
