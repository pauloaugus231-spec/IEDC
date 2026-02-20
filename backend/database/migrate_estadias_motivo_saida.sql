-- Migration: Adicionar coluna motivo_saida na tabela estadias
-- Data: 2025-12-26
-- Descrição: Adiciona suporte para registrar o motivo de saída de uma estadia

-- Adicionar coluna motivo_saida
ALTER TABLE estadias ADD COLUMN IF NOT EXISTS motivo_saida VARCHAR(50);

-- Valores possíveis para motivo_saida:
-- 'fim_periodo' - Fim do período de estadia (checkout normal)
-- 'voluntario' - Saída voluntária do hóspede
-- 'abandono' - Abandono de vaga (não compareceu à triagem)
-- 'regra' - Violação de regras
-- 'transferencia' - Transferência para outro abrigo
-- 'hospitalizacao' - Hospitalização
-- 'outro' - Outro motivo

COMMENT ON COLUMN estadias.motivo_saida IS 'Motivo da saída do hóspede (fim_periodo, voluntario, abandono, regra, transferencia, hospitalizacao, outro)';
