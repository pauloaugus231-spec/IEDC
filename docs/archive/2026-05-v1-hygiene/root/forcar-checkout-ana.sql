-- FORÇAR CHECKOUT DE ANA COSTA DIRETAMENTE NO BANCO

BEGIN;

-- Mostrar estado ANTES
SELECT 'ANTES DO UPDATE' as momento, * FROM estadias WHERE id = '6e0c9477-5427-4b92-abf3-25b8e55cb4dc';

-- Fazer checkout de Ana Costa
UPDATE estadias 
SET 
  status = 'checkout_automatico',
  data_checkout = CURRENT_TIMESTAMP,
  observacoes_checkout = 'Checkout automático após período limite (SQL direto).',
  funcionario_checkout = 'sistema_sql_direto',
  updated_at = CURRENT_TIMESTAMP
WHERE id = '6e0c9477-5427-4b92-abf3-25b8e55cb4dc';

-- Liberar cama
UPDATE camas 
SET status = 'disponivel', updated_at = CURRENT_TIMESTAMP
WHERE id = 'cd75fc2b-6484-4367-b35b-23ce8e728b79';

-- Atualizar pessoa
UPDATE pessoas 
SET status_cadastro = 'inativo', updated_at = CURRENT_TIMESTAMP
WHERE id = '8cc43326-b641-4444-a744-f5c5eec47871';

-- Mostrar estado DEPOIS
SELECT 'DEPOIS DO UPDATE' as momento, * FROM estadias WHERE id = '6e0c9477-5427-4b92-abf3-25b8e55cb4dc';

COMMIT;

-- Verificar resultado final
SELECT 
  'RESULTADO FINAL' as info,
  e.id,
  e.status,
  e.data_checkout,
  p.nome,
  p.status_cadastro,
  c.numero as cama,
  c.status as cama_status
FROM estadias e
LEFT JOIN pessoas p ON e.pessoa_id = p.id
LEFT JOIN camas c ON e.cama_id = c.id
WHERE e.id = '6e0c9477-5427-4b92-abf3-25b8e55cb4dc';
