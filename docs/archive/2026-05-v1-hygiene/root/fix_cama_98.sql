-- Script para corrigir problema de duplicação na cama 98 (LGBT)
-- Executar este script no banco de dados PostgreSQL

-- 1. Verificar a situação atual da cama 98 (LGBT)
-- Cama 98 está na casa LGBT e tem 2 pessoas:
-- - Diego Fernandes (checkin: 2025-12-26)
-- - Ana Costa (checkin: 2025-12-20)

SELECT 
    e.id as estadia_id,
    e.pessoa_id,
    p.nome as pessoa_nome,
    c.numero as cama_numero,
    c.id as cama_id,
    c.casa,
    e.status as estadia_status,
    e.data_checkin
FROM estadias e
JOIN camas c ON e.cama_id = c.id
JOIN pessoas p ON e.pessoa_id = p.id
WHERE c.numero = 98 
AND c.casa = 'LGBT'
AND e.status = 'ativa'
ORDER BY e.data_checkin;

-- 2. Buscar primeira cama livre em qualquer casa (já que LGBT está lotada)
SELECT id, numero, casa, status 
FROM camas 
WHERE status = 'DISPONIVEL'
ORDER BY numero
LIMIT 1;

-- 3. SOLUÇÃO: Mover Diego Fernandes (checkin mais recente) para cama 9 (masculina, livre)
-- Substitua os IDs conforme o resultado das queries acima

-- Atualizar a estadia de Diego Fernandes para cama 9
UPDATE estadias 
SET cama_id = (SELECT id FROM camas WHERE numero = 9 AND casa = 'MASCULINA' LIMIT 1)
WHERE id = 'f4a08bc5-6c2d-4609-9cd5-03c00e53be1f';

-- Atualizar status da cama 9 para ocupada
UPDATE camas 
SET status = 'OCUPADA'
WHERE numero = 9 AND casa = 'MASCULINA';

-- 4. Verificar se a correção funcionou
SELECT 
    e.id as estadia_id,
    p.nome as pessoa_nome,
    c.numero as cama_numero,
    c.casa,
    e.status
FROM estadias e
JOIN camas c ON e.cama_id = c.id
JOIN pessoas p ON e.pessoa_id = p.id
WHERE c.numero IN (9, 98)
AND e.status = 'ativa'
ORDER BY c.numero;
