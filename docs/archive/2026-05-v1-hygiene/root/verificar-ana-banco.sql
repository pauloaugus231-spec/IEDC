-- Query simples para ver o estado REAL no banco
SELECT 
  'STATUS REAL NO BANCO' as info,
  e.id,
  e.status,
  e.data_checkout,
  e.funcionario_checkout,
  e.updated_at,
  p.nome,
  p.status_cadastro
FROM estadias e
JOIN pessoas p ON e.pessoa_id = p.id
WHERE e.id = '6e0c9477-5427-4b92-abf3-25b8e55cb4dc';
