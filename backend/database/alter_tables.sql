-- Adiciona coluna cpf na tabela pessoas, se não existir
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pessoas' AND column_name='cpf') THEN
        ALTER TABLE pessoas ADD COLUMN cpf VARCHAR(20);
    END IF;
END $$;

-- Cria tabela estadias, se não existir
CREATE TABLE IF NOT EXISTS estadias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_id UUID NOT NULL,
    data_checkin TIMESTAMP NOT NULL,
    data_checkout TIMESTAMP,
    data_limite DATE NOT NULL,
    numero_vaga INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'ativa',
    observacoes_checkin TEXT,
    observacoes_checkout TEXT,
    funcionario_checkin VARCHAR(100),
    funcionario_checkout VARCHAR(100),
    prorrogada BOOLEAN DEFAULT FALSE,
    dias_prorrogacao INT DEFAULT 0,
    motivo_prorrogacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pessoa_estadia FOREIGN KEY(pessoa_id) REFERENCES pessoas(id)
);

-- Adiciona colunas de saúde na tabela pessoas
ALTER TABLE "pessoas" ADD COLUMN IF NOT EXISTS "alergias" text;
ALTER TABLE "pessoas" ADD COLUMN IF NOT EXISTS "condicoes_cronicas" text;
ALTER TABLE "pessoas" ADD COLUMN IF NOT EXISTS "medicamentos_uso_continuo" text;

-- Adiciona coluna lgbt na tabela pessoas
ALTER TABLE "pessoas" ADD COLUMN IF NOT EXISTS "lgbt" BOOLEAN DEFAULT FALSE;
