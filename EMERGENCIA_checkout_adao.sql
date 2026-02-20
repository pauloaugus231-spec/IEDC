-- ========================================
-- SCRIPT DE EMERGÊNCIA: CHECKOUT ADÃO SERGIO
-- Execute este SQL diretamente no PostgreSQL
-- ========================================

BEGIN;

-- 1. Fazer checkout da estadia
UPDATE estadias 
SET 
  status = 'checkout_automatico',
  data_checkout = CURRENT_TIMESTAMP,
  observacoes_checkout = 'Checkout manual via SQL - Sistema autônomo não persistiu',
  funcionario_checkout = 'admin_sql',
  updated_at = CURRENT_TIMESTAMP
WHERE id = '9c994d5b-0565-4255-b162-1b2356404905'
RETURNING id, status, data_checkout;

-- 2. Liberar a cama 44
UPDATE camas 
SET 
  status = 'disponivel',
  updated_at = CURRENT_TIMESTAMP
WHERE id = '26120433-1f5f-4570-93eb-a3c6951a7b78'
RETURNING id, numero, status;

-- 3. Atualizar pessoa para inativa
UPDATE pessoas 
SET 
  status_cadastro = 'inativa',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'a0f4877a-f39c-480d-8d33-9913e92cf2ab'
RETURNING id, nome, status_cadastro;

-- Verificar se tudo foi atualizado
SELECT 
  'VERIFICAÇÃO' as tipo,
  (SELECT status FROM estadias WHERE id = '9c994d5b-0565-4255-b162-1b2356404905') as status_estadia,
  (SELECT status FROM camas WHERE id = '26120433-1f5f-4570-93eb-a3c6951a7b78') as status_cama,
  (SELECT status_cadastro FROM pessoas WHERE id = 'a0f4877a-f39c-480d-8d33-9913e92cf2ab') as status_pessoa;

-- Se tudo estiver OK, descomente a linha abaixo:
COMMIT;
-- Se algo der errado, use: ROLLBACK;
