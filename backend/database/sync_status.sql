-- SCRIPT DE CORREÇÃO E SINCRONIZAÇÃO DE DADOS

-- Passo 1: Corrigir estadias ativas duplicadas para a mesma pessoa.
-- Se uma pessoa tem mais de uma estadia 'ativa', este script manterá a mais recente
-- e marcará as mais antigas como 'finalizada'.
WITH EstadiasAtivasRankeadas AS (
    SELECT
        id,
        pessoa_id,
        ROW_NUMBER() OVER(PARTITION BY pessoa_id ORDER BY data_checkin DESC) as rn
    FROM
        estadias
    WHERE
        status = 'ativa'
),
EstadiasParaFinalizar AS (
    SELECT id FROM EstadiasAtivasRankeadas WHERE rn > 1
)
UPDATE estadias
SET
    status = 'finalizada',
    data_checkout = NOW(),
    observacoes_checkout = 'Check-out automático por correção de inconsistência de dados.'
WHERE
    id IN (SELECT id FROM EstadiasParaFinalizar);


-- Passo 2: Sincronizar o status na tabela 'pessoas'.
-- Garante que qualquer pessoa com uma estadia ativa tenha o status 'ativa'.
UPDATE pessoas
SET status_cadastro = 'ativa'
WHERE id IN (
    SELECT DISTINCT pessoa_id
    FROM estadias
    WHERE status = 'ativa'
);


-- Passo 3: Sincronizar pessoas que deveriam estar inativas.
-- Garante que qualquer pessoa marcada como 'ativa' mas que não possui mais
-- uma estadia ativa seja atualizada para 'inativo'.
UPDATE pessoas
SET status_cadastro = 'inativo'
WHERE
    status_cadastro = 'ativa' AND
    id NOT IN (
        SELECT DISTINCT pessoa_id
        FROM estadias
        WHERE status = 'ativa'
    );
