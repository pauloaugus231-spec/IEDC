CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION unaccent_string(text)
RETURNS text AS $$
SELECT unaccent($1);
$$ LANGUAGE sql IMMUTABLE;

CREATE TABLE IF NOT EXISTS ocorrencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_id UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(100),
    descricao TEXT NOT NULL,
    severidade VARCHAR(20) DEFAULT 'baixa',
    data_ocorrencia TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pessoa_ocorrencia FOREIGN KEY(pessoa_id) REFERENCES pessoas(id)
);

CREATE TABLE IF NOT EXISTS pessoas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(20),
    rg VARCHAR(20),
    data_nascimento DATE,
    naturalidade VARCHAR(100),
    telefone VARCHAR(20),
    escolaridade VARCHAR(100),
    profissao VARCHAR(100),
    medicamentos_que_usa TEXT,
    endereco VARCHAR(255),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    cep VARCHAR(20),
    nome_mae VARCHAR(100),
    nome_pai VARCHAR(100),
    contato_emergencia VARCHAR(100),
    telefone_emergencia VARCHAR(20),
    observacoes TEXT,
    status_cadastro VARCHAR(20) DEFAULT 'pendente',
    tipo_vaga VARCHAR(20) DEFAULT 'masculina',
    foto_url VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipobloqueio') THEN
    CREATE TYPE "TipoBloqueio" AS ENUM ('comportamento', 'descumprimento_regras', 'administrativo', 'outros');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS bloqueios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_id UUID NOT NULL,
    tipo "TipoBloqueio" NOT NULL,
    motivo TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    dias_bloqueio INT,
    criado_por VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pessoa_bloqueio FOREIGN KEY(pessoa_id) REFERENCES pessoas(id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tiposolicitacao') THEN
    CREATE TYPE "TipoSolicitacao" AS ENUM ('prorrogacao', 'suspensao', 'bloqueio', 'desbloqueio');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statussolicitacao') THEN
    CREATE TYPE "StatusSolicitacao" AS ENUM ('pendente', 'aprovada', 'recusada', 'cancelada');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS solicitacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pessoa_id UUID NOT NULL,
    tipo "TipoSolicitacao" NOT NULL,
    status "StatusSolicitacao" DEFAULT 'pendente',
    titulo VARCHAR(255) NOT NULL,
    justificativa TEXT NOT NULL,
    solicitado_por VARCHAR(100) NOT NULL,
    data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analisado_por VARCHAR(100),
    data_analise TIMESTAMP,
    parecer TEXT,
    dias_prorrogacao INT,
    nova_data_limite DATE,
    data_inicio_bloqueio DATE,
    data_fim_bloqueio DATE,
    motivo_bloqueio TEXT,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pessoa_solicitacao FOREIGN KEY(pessoa_id) REFERENCES pessoas(id)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'turnoescala') THEN
    CREATE TYPE "TurnoEscala" AS ENUM ('manha', 'tarde', 'noite');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statusescala') THEN
    CREATE TYPE "StatusEscala" AS ENUM ('ativa', 'inativa');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS escala (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    funcao VARCHAR(100) NOT NULL,
    turno "TurnoEscala" NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status "StatusEscala" DEFAULT 'ativa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
