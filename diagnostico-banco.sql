-- Script de diagnóstico completo
-- Execute no banco de dados para entender o estado real

-- 1. Verificar o status EXATO da estadia do Adão
SELECT 
  'Estadia do Adão' as info,
  id,
  pessoa_id,
  status,
  pg_typeof(status) as tipo_status,
  length(status) as tamanho_status,
  data_checkin,
  data_checkout,
  data_limite,
  CASE 
    WHEN status = 'ativa' THEN 'Match exato'
    WHEN LOWER(status) = 'ativa' THEN 'Match case-insensitive'
    ELSE 'Não match: "' || status || '"'
  END as status_check
FROM estadias
WHERE id = '9c994d5b-0565-4255-b162-1b2356404905';

-- 2. Listar TODOS os valores únicos de status na tabela
SELECT 
  'Valores de status únicos' as info,
  status,
  pg_typeof(status) as tipo,
  COUNT(*) as quantidade
FROM estadias
GROUP BY status
ORDER BY quantidade DESC;

-- 3. Verificar se há algum ENUM definido
SELECT 
  'Tipos ENUM' as info,
  typname,
  enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname LIKE '%estadia%' OR typname LIKE '%status%'
ORDER BY typname, e.enumsortorder;

-- 4. Forçar UPDATE direto (TESTE)
-- Descomente as linhas abaixo APENAS se quiser testar o update diretamente:
-- BEGIN;
-- UPDATE estadias 
-- SET status = 'checkout_automatico'::text
-- WHERE id = '9c994d5b-0565-4255-b162-1b2356404905';
-- SELECT * FROM estadias WHERE id = '9c994d5b-0565-4255-b162-1b2356404905';
-- ROLLBACK; -- ou COMMIT para confirmar
