-- ===============================================
-- TESTE COMPLETO DO SISTEMA DE CHECKOUT AUTOMÁTICO
-- ===============================================

-- 1. VERIFICAR SITUAÇÃO ATUAL DE ANA COSTA
SELECT 
  '=== ANA COSTA - ANTES DO CHECKOUT ===' as info,
  e.id as estadia_id,
  e.status as estadia_status,
  e.data_checkin,
  e.data_limite,
  e.data_checkout,
  CURRENT_DATE as hoje,
  (CURRENT_DATE - e.data_limite) as dias_atrasados,
  p.nome,
  p.status_cadastro,
  c.numero as cama,
  c.status as cama_status
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
JOIN camas c ON e.cama_id = c.id
WHERE p.nome = 'Ana Costa'
  AND e.status = 'ativa'
ORDER BY e.created_at DESC
LIMIT 1;

-- 2. FORÇAR CHECKOUT DE ANA COSTA
BEGIN;

UPDATE estadias 
SET 
  status = 'checkout_automatico',
  data_checkout = CURRENT_TIMESTAMP,
  observacoes_checkout = 'Checkout automático - Estadia vencida em ' || data_limite::text,
  funcionario_checkout = 'sistema_automatico_teste',
  updated_at = CURRENT_TIMESTAMP
WHERE id = '6e0c9477-5427-4b92-abf3-25b8e55cb4dc'
  AND status = 'ativa'
RETURNING id, status, data_checkout;

UPDATE camas 
SET 
  status = 'disponivel',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'cd75fc2b-6484-4367-b35b-23ce8e728b79'
RETURNING id, numero, status;

UPDATE pessoas 
SET 
  status_cadastro = 'inativo',
  updated_at = CURRENT_TIMESTAMP
WHERE id = '8cc43326-b641-4444-a744-f5c5eec47871'
RETURNING id, nome, status_cadastro;

COMMIT;

-- 3. VERIFICAR RESULTADO
SELECT 
  '=== ANA COSTA - DEPOIS DO CHECKOUT ===' as info,
  e.id as estadia_id,
  e.status as estadia_status,
  e.data_checkout,
  e.funcionario_checkout,
  p.nome,
  p.status_cadastro,
  c.numero as cama,
  c.status as cama_status
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
LEFT JOIN camas c ON e.cama_id = c.id
WHERE e.id = '6e0c9477-5427-4b92-abf3-25b8e55cb4dc';

-- 4. VERIFICAR SE HÁ OUTRAS ESTADIAS VENCIDAS
SELECT 
  '=== OUTRAS ESTADIAS VENCIDAS ===' as info,
  COUNT(*) as total
FROM estadias
WHERE status = 'ativa'
  AND data_limite <= CURRENT_DATE;

SELECT 
  p.nome,
  e.data_limite,
  (CURRENT_DATE - e.data_limite) as dias_atrasados,
  c.numero as cama,
  c.casa
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
LEFT JOIN camas c ON e.cama_id = c.id
WHERE e.status = 'ativa'
  AND e.data_limite <= CURRENT_DATE
ORDER BY e.data_limite;

-- 5. ESTATÍSTICAS FINAIS
SELECT 
  '=== ESTATÍSTICAS ===' as info,
  (SELECT COUNT(*) FROM estadias WHERE status = 'ativa') as estadias_ativas,
  (SELECT COUNT(*) FROM estadias WHERE status = 'checkout_automatico') as checkouts_automaticos,
  (SELECT COUNT(*) FROM camas WHERE status = 'disponivel') as camas_disponiveis,
  (SELECT COUNT(*) FROM camas WHERE status = 'ocupada') as camas_ocupadas;
