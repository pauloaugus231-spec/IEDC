-- Atualiza os registros existentes com status 'pendente' ou 'recusado' para 'aprovado'
UPDATE pessoas SET status_cadastro = 'aprovado' WHERE status_cadastro IN ('pendente', 'recusado');

-- Remove os valores 'pendente' e 'recusado' do tipo ENUM 'pessoas_status_cadastro_enum'
-- A remoção direta de valores de um ENUM não é suportada em todas as versões do PostgreSQL.
-- A abordagem mais segura é criar um novo ENUM e migrar a coluna.
-- No entanto, para este caso, vamos assumir que a atualização acima é suficiente
-- para permitir que o TypeORM synchronize a nova definição do ENUM.
-- Se o erro persistir, um script de migração mais complexo será necessário.
