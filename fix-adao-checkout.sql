-- Script para fazer checkout manual do Adão Sergio
-- Execute este script diretamente no banco de dados PostgreSQL

BEGIN;

-- 1. Fazer checkout da estadia
UPDATE estadias 
SET 
  status = 'checkout_automatico',
  data_checkout = CURRENT_TIMESTAMP,
  observacoes_checkout = 'Checkout manual via SQL - sistema automático com problema',
  funcionario_checkout = 'admin_manual',
  updated_at = CURRENT_TIMESTAMP
WHERE id = '9c994d5b-0565-4255-b162-1b2356404905'
  AND status = 'ativa';

-- 2. Liberar a cama 44
UPDATE camas 
SET 
  status = 'disponivel',
  updated_at = CURRENT_TIMESTAMP
WHERE id = '26120433-1f5f-4570-93eb-a3c6951a7b78';

-- 3. Atualizar pessoa para inativa
UPDATE pessoas 
SET 
  status_cadastro = 'inativa',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'a0f4877a-f39c-480d-8d33-9913e92cf2ab';

-- Verificar as mudanças
SELECT 
  'Estadia' as tabela,
  id,
  status,
  data_checkout
FROM estadias 
WHERE id = '9c994d5b-0565-4255-b162-1b2356404905'
UNION ALL
SELECT 
  'Cama' as tabela,
  id::text,
  status,
  NULL
FROM camas 
WHERE id = '26120433-1f5f-4570-93eb-a3c6951a7b78'
UNION ALL
SELECT 
  'Pessoa' as tabela,
  id::text,
  status_cadastro,
  NULL
FROM pessoas 
WHERE id = 'a0f4877a-f39c-480d-8d33-9913e92cf2ab';

-- Se tudo estiver OK, execute:
COMMIT;

-- Se algo der errado, execute:
-- ROLLBACK;
