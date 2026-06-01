-- DIAGNÓSTICO COMPLETO E CORREÇÃO

-- 1. Verificar histórico de Adão Sergio
SELECT 
  'HISTÓRICO ADÃO SERGIO' as info,
  p.nome,
  p.status_cadastro,
  e.status as estadia_status,
  e.data_checkin,
  e.data_checkout,
  e.data_limite,
  e.funcionario_checkout,
  e.observacoes_checkout,
  c.numero as cama
FROM pessoas p
LEFT JOIN estadias e ON p.id = e.pessoa_id
LEFT JOIN camas c ON e.cama_id = c.id
WHERE LOWER(p.nome) LIKE '%adao%' OR LOWER(p.nome) LIKE '%adão%'
ORDER BY e.created_at DESC;

-- 2. Verificar situação atual de Ana Costa
SELECT 
  'ANA COSTA - SITUAÇÃO ATUAL' as info,
  p.id as pessoa_id,
  p.nome,
  p.status_cadastro,
  e.id as estadia_id,
  e.status as estadia_status,
  e.data_checkin,
  e.data_checkout,
  e.data_limite,
  CURRENT_DATE as data_hoje,
  (CURRENT_DATE - e.data_limite) as dias_vencidos,
  c.id as cama_id,
  c.numero as cama_numero,
  c.status as cama_status
FROM pessoas p
LEFT JOIN estadias e ON p.id = e.pessoa_id
LEFT JOIN camas c ON e.cama_id = c.id
WHERE LOWER(p.nome) = 'ana costa'
ORDER BY e.created_at DESC
LIMIT 1;

-- 3. Verificar tipo da coluna status (se é ENUM ou TEXT)
SELECT 
  'SCHEMA ESTADIAS' as info,
  column_name, 
  data_type, 
  udt_name
FROM information_schema.columns 
WHERE table_name = 'estadias' 
AND column_name = 'status';

-- 4. Listar todos os valores de status existentes
SELECT 
  'VALORES DE STATUS' as info,
  status,
  COUNT(*) as quantidade
FROM estadias
GROUP BY status
ORDER BY quantidade DESC;

-- 5. CORREÇÃO: Fazer checkout de Ana Costa
BEGIN;

-- Atualizar estadia de Ana Costa
UPDATE estadias 
SET 
  status = 'checkout_automatico',
  data_checkout = CURRENT_TIMESTAMP,
  observacoes_checkout = 'Checkout automático após período limite (corrigido manualmente).',
  funcionario_checkout = 'sistema_automatico_correcao',
  updated_at = CURRENT_TIMESTAMP
WHERE id = '6e0c9477-5427-4b92-abf3-25b8e55cb4dc'
  AND status = 'ativa';

-- Liberar cama de Ana Costa
UPDATE camas 
SET 
  status = 'disponivel',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'cd75fc2b-6484-4367-b35b-23ce8e728b79'
  AND status = 'ocupada';

-- Atualizar pessoa Ana Costa para inativa
UPDATE pessoas 
SET 
  status_cadastro = 'inativo',
  updated_at = CURRENT_TIMESTAMP
WHERE id = '8cc43326-b641-4444-a744-f5c5eec47871'
  AND status_cadastro = 'ativa';

-- Verificar resultado
SELECT 
  'RESULTADO ANA COSTA' as info,
  p.nome,
  p.status_cadastro,
  e.status as estadia_status,
  e.data_checkout,
  c.status as cama_status
FROM pessoas p
LEFT JOIN estadias e ON p.id = e.pessoa_id AND e.id = '6e0c9477-5427-4b92-abf3-25b8e55cb4dc'
LEFT JOIN camas c ON c.id = 'cd75fc2b-6484-4367-b35b-23ce8e728b79'
WHERE p.id = '8cc43326-b641-4444-a744-f5c5eec47871';

COMMIT;

-- 6. Verificar TODAS as estadias vencidas que precisam checkout
SELECT 
  'ESTADIAS VENCIDAS - AGUARDANDO CHECKOUT' as info,
  COUNT(*) as total_vencidas
FROM estadias
WHERE status = 'ativa'
  AND data_limite < CURRENT_DATE;

SELECT 
  p.nome,
  e.data_limite,
  (CURRENT_DATE - e.data_limite) as dias_vencidos,
  c.numero as cama,
  c.casa
FROM estadias e
LEFT JOIN pessoas p ON e.pessoa_id = p.id
LEFT JOIN camas c ON e.cama_id = c.id
WHERE e.status = 'ativa'
  AND e.data_limite < CURRENT_DATE
ORDER BY e.data_limite;
