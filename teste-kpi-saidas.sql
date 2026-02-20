-- TESTE DO KPI "SAÍDAS PREVISTAS HOJE"

-- Mostrar a data de hoje
SELECT 
  '=== DATA DE HOJE ===' as info,
  CURRENT_DATE as hoje,
  CURRENT_DATE::text as hoje_formatado;

-- Contar estadias que terminam HOJE (última noite é hoje)
SELECT 
  '=== SAÍDAS PREVISTAS PARA HOJE ===' as info,
  COUNT(*) as quantidade
FROM estadias
WHERE status = 'ativa'
  AND DATE(data_limite) = CURRENT_DATE;

-- Listar detalhes das estadias que terminam hoje
SELECT 
  '=== DETALHES DAS SAÍDAS HOJE ===' as info,
  p.nome,
  e.data_checkin,
  e.data_limite,
  CURRENT_DATE - DATE(e.data_checkin) as dias_hospedado,
  c.numero as cama,
  c.casa
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
LEFT JOIN camas c ON e.cama_id = c.id
WHERE e.status = 'ativa'
  AND DATE(e.data_limite) = CURRENT_DATE
ORDER BY p.nome;

-- Contar estadias que terminam AMANHÃ (para referência)
SELECT 
  '=== SAÍDAS PREVISTAS PARA AMANHÃ ===' as info,
  COUNT(*) as quantidade
FROM estadias
WHERE status = 'ativa'
  AND DATE(data_limite) = CURRENT_DATE + 1;

-- Contar estadias que terminam nos próximos 7 dias
SELECT 
  DATE(data_limite) as data_saida,
  COUNT(*) as quantidade_saidas,
  STRING_AGG(p.nome, ', ') as hospedes
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
WHERE e.status = 'ativa'
  AND DATE(e.data_limite) BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
GROUP BY DATE(data_limite)
ORDER BY DATE(data_limite);

-- Exemplo: Se hoje é 05/01/2026
-- Uma estadia com data_limite = 05/01/2026 significa:
--   - Última noite: 05/01/2026
--   - Checkout automático: 06/01/2026 às 00:00
--   - Deve aparecer no KPI "Saídas Previstas Hoje"
