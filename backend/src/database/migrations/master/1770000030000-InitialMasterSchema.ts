import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMasterSchema1770000030000 implements MigrationInterface {
  name = 'InitialMasterSchema1770000030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SCHEMA IF NOT EXISTS identidade;
      CREATE SCHEMA IF NOT EXISTS comercial;
      CREATE SCHEMA IF NOT EXISTS membros;
      CREATE SCHEMA IF NOT EXISTS voluntariado;

      REVOKE ALL ON SCHEMA identidade FROM PUBLIC;
      REVOKE ALL ON SCHEMA comercial FROM PUBLIC;
      REVOKE ALL ON SCHEMA membros FROM PUBLIC;
      REVOKE ALL ON SCHEMA voluntariado FROM PUBLIC;
    `);

    await queryRunner.query(`
      CREATE TABLE identidade.pessoas (
        id uuid PRIMARY KEY,
        nome_registro varchar(180) NOT NULL,
        nome_social varchar(180) NULL,
        cpf varchar(20) NOT NULL DEFAULT '',
        telefone varchar(40) NOT NULL DEFAULT '',
        email varchar(180) NOT NULL DEFAULT '',
        endereco varchar(240) NOT NULL DEFAULT '',
        data_nascimento date NULL,
        ativo boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_identidade_pessoas_nome CHECK (btrim(nome_registro) <> '')
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uidx_identidade_pessoas_cpf_digits
        ON identidade.pessoas ((regexp_replace(cpf, '\\D', '', 'g')))
        WHERE regexp_replace(cpf, '\\D', '', 'g') <> '';
      CREATE INDEX idx_identidade_pessoas_nome_registro
        ON identidade.pessoas (lower(nome_registro));
      CREATE INDEX idx_identidade_pessoas_nome_social
        ON identidade.pessoas (lower(nome_social))
        WHERE nome_social IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.perfis_pessoa (
        pessoa_id uuid PRIMARY KEY REFERENCES identidade.pessoas(id) ON DELETE RESTRICT,
        observacoes text NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.lojas (
        id uuid PRIMARY KEY,
        slug varchar(40) UNIQUE NOT NULL,
        nome varchar(120) NOT NULL,
        ativa boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.produtos (
        id uuid PRIMARY KEY,
        loja_id uuid NOT NULL REFERENCES comercial.lojas(id) ON DELETE RESTRICT,
        nome varchar(180) NOT NULL,
        categoria varchar(120) NOT NULL DEFAULT 'Diversos',
        preco numeric(10,2) NOT NULL DEFAULT 0,
        ativo boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_comercial_produtos_preco CHECK (preco >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.caixas (
        id uuid PRIMARY KEY,
        codigo varchar(40) UNIQUE NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'aberto',
        aberto_por varchar(160) NULL,
        fechado_por varchar(160) NULL,
        saldo_inicial numeric(12,2) NOT NULL DEFAULT 0,
        total_sistema numeric(12,2) NOT NULL DEFAULT 0,
        total_conferido numeric(12,2) NOT NULL DEFAULT 0,
        diferenca numeric(12,2) NOT NULL DEFAULT 0,
        comandas_pagas integer NOT NULL DEFAULT 0,
        comandas_desistidas integer NOT NULL DEFAULT 0,
        observacoes_abertura text NULL,
        observacoes_fechamento text NULL,
        aberto_em timestamp NOT NULL DEFAULT NOW(),
        fechado_em timestamp NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.comandas (
        id uuid PRIMARY KEY,
        codigo varchar(30) UNIQUE NOT NULL,
        pessoa_id uuid NOT NULL REFERENCES identidade.pessoas(id) ON DELETE RESTRICT,
        nome_pessoa_snapshot varchar(180) NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'aberta',
        criada_por varchar(160) NULL,
        observacoes text NULL,
        motivo_status text NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        finalizada_em timestamp NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.comanda_itens (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercial.comandas(id) ON DELETE CASCADE,
        loja_id uuid NOT NULL REFERENCES comercial.lojas(id) ON DELETE RESTRICT,
        produto_id uuid NULL REFERENCES comercial.produtos(id) ON DELETE SET NULL,
        descricao varchar(220) NOT NULL,
        categoria varchar(120) NOT NULL DEFAULT 'Diversos',
        quantidade integer NOT NULL DEFAULT 1,
        valor_unitario numeric(10,2) NOT NULL DEFAULT 0,
        desconto numeric(10,2) NOT NULL DEFAULT 0,
        total_item numeric(10,2) NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_comercial_itens_quantidade CHECK (quantidade > 0),
        CONSTRAINT ck_comercial_itens_valores CHECK (
          valor_unitario >= 0 AND desconto >= 0 AND total_item >= 0
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.pagamentos (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercial.comandas(id) ON DELETE CASCADE,
        caixa_id uuid NULL REFERENCES comercial.caixas(id) ON DELETE RESTRICT,
        metodo varchar(40) NOT NULL,
        valor numeric(10,2) NOT NULL DEFAULT 0,
        recebido_por varchar(160) NULL,
        observacoes text NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_comercial_pagamentos_valor CHECK (valor > 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.eventos_comanda (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercial.comandas(id) ON DELETE CASCADE,
        tipo varchar(80) NOT NULL,
        descricao text NOT NULL,
        usuario varchar(160) NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.retiradas (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercial.comandas(id) ON DELETE CASCADE,
        loja_id uuid NOT NULL REFERENCES comercial.lojas(id) ON DELETE RESTRICT,
        status varchar(40) NOT NULL DEFAULT 'aguardando_retirada',
        notificada_em timestamp NOT NULL DEFAULT NOW(),
        retirada_em timestamp NULL,
        entregue_por varchar(160) NULL,
        observacoes text NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        UNIQUE (comanda_id, loja_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.caixa_metodos (
        id uuid PRIMARY KEY,
        caixa_id uuid NOT NULL REFERENCES comercial.caixas(id) ON DELETE CASCADE,
        metodo varchar(80) NOT NULL,
        valor_sistema numeric(12,2) NOT NULL DEFAULT 0,
        valor_informado numeric(12,2) NOT NULL DEFAULT 0,
        diferenca numeric(12,2) NOT NULL DEFAULT 0,
        quantidade_pagamentos integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT NOW(),
        UNIQUE (caixa_id, metodo)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE comercial.migracoes_legado (
        chave varchar(100) PRIMARY KEY,
        detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
        concluida_em timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE VIEW comercial.clientes AS
      SELECT
        p.id,
        COALESCE(NULLIF(btrim(p.nome_social), ''), p.nome_registro) AS nome,
        p.nome_registro,
        p.nome_social,
        p.telefone,
        p.cpf,
        p.email,
        p.endereco,
        p.data_nascimento,
        perfil.observacoes,
        p.ativo,
        p.created_at,
        GREATEST(p.updated_at, COALESCE(perfil.updated_at, p.updated_at)) AS updated_at
      FROM identidade.pessoas p
      LEFT JOIN comercial.perfis_pessoa perfil ON perfil.pessoa_id = p.id
      WHERE p.ativo = true
    `);

    await queryRunner.query(`
      CREATE INDEX idx_comercial_comandas_status ON comercial.comandas(status);
      CREATE INDEX idx_comercial_comandas_pessoa ON comercial.comandas(pessoa_id);
      CREATE INDEX idx_comercial_itens_comanda ON comercial.comanda_itens(comanda_id);
      CREATE INDEX idx_comercial_itens_loja ON comercial.comanda_itens(loja_id);
      CREATE INDEX idx_comercial_produtos_loja ON comercial.produtos(loja_id, ativo);
      CREATE INDEX idx_comercial_pagamentos_comanda ON comercial.pagamentos(comanda_id);
      CREATE INDEX idx_comercial_pagamentos_caixa ON comercial.pagamentos(caixa_id);
      CREATE INDEX idx_comercial_caixas_status ON comercial.caixas(status);
      CREATE INDEX idx_comercial_retiradas_loja_status ON comercial.retiradas(loja_id, status);
      CREATE INDEX idx_comercial_retiradas_comanda ON comercial.retiradas(comanda_id);
    `);

    await queryRunner.query(`
      COMMENT ON SCHEMA identidade IS 'Cadastro mestre de pessoas do IEDC';
      COMMENT ON SCHEMA comercial IS 'Operacao comercial das lojas, comandas, caixa e retiradas';
      COMMENT ON SCHEMA membros IS 'Dados privativos do futuro departamento de membros';
      COMMENT ON SCHEMA voluntariado IS 'Dados privativos do futuro departamento de voluntariado';
      COMMENT ON COLUMN comercial.comandas.nome_pessoa_snapshot IS
        'Nome exibido no momento da compra para preservar o historico da comanda';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA IF EXISTS voluntariado CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS membros CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS comercial CASCADE`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS identidade CASCADE`);
  }
}
