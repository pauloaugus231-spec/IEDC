-- Criar tabela notificacao_config
CREATE TABLE IF NOT EXISTS notificacao_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT CHECK (tipo IN ('email', 'telegram')),
  destino TEXT NOT NULL,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir exemplos fictícios
INSERT INTO notificacao_config (tipo, destino, nome) VALUES
('email', 'gerente@exemplo.com', 'Gerente João'),
('telegram', '-1001234567890', 'Grupo Coordenação');

-- Script para inserir dados de teste na tabela notificacao_config
-- Execute este script no seu banco de dados PostgreSQL

INSERT INTO notificacao_config (tipo, destino, nome, ativo) VALUES
('telegram', '-5008990442', 'Grupo Gestão', true),
('email', 'pauloaugus231@icloud.com', 'Paulo iCloud', true)
ON CONFLICT DO NOTHING;

-- Verificar dados inseridos
SELECT * FROM notificacao_config;
