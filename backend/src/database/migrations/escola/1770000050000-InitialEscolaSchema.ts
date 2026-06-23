import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialEscolaSchema1770000050000 implements MigrationInterface {
  name = 'InitialEscolaSchema1770000050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_professoras (
        id uuid PRIMARY KEY,
        nome character varying(160) NOT NULL,
        telefone character varying(40),
        email character varying(160),
        funcao character varying(80) DEFAULT 'Regente' NOT NULL,
        status character varying(30) DEFAULT 'ativa' NOT NULL,
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_turmas (
        id uuid PRIMARY KEY,
        nome character varying(120) UNIQUE NOT NULL,
        faixa_etaria character varying(80) NOT NULL,
        turno character varying(40) DEFAULT 'Integral' NOT NULL,
        capacidade integer DEFAULT 0 NOT NULL,
        ativa boolean DEFAULT true NOT NULL,
        professora_responsavel_id uuid REFERENCES creche_professoras(id) ON DELETE SET NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_criancas (
        id uuid PRIMARY KEY,
        codigo character varying(30) UNIQUE NOT NULL,
        nome character varying(180) NOT NULL,
        cpf character varying(20) DEFAULT '' NOT NULL,
        rg character varying(20),
        nis character varying(20) DEFAULT '' NOT NULL,
        data_nascimento date NOT NULL,
        data_ingresso date DEFAULT CURRENT_DATE NOT NULL,
        turma_id uuid NOT NULL REFERENCES creche_turmas(id),
        status character varying(30) DEFAULT 'ativa' NOT NULL,
        sexo character varying(30) DEFAULT 'menina' NOT NULL,
        genero character varying(60),
        raca_cor character varying(80) DEFAULT 'Nao informado' NOT NULL,
        naturalidade character varying(120),
        endereco character varying(240),
        bairro character varying(120),
        cidade character varying(120) DEFAULT 'Porto Alegre',
        uf character varying(2) DEFAULT 'RS',
        cep character varying(20),
        escola_origem character varying(180),
        alergias text,
        condicoes_saude text,
        medicamentos text,
        autorizacao_imagem boolean DEFAULT false NOT NULL,
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_responsaveis (
        id uuid PRIMARY KEY,
        crianca_id uuid NOT NULL REFERENCES creche_criancas(id) ON DELETE CASCADE,
        nome character varying(180) NOT NULL,
        parentesco character varying(80) NOT NULL,
        cpf character varying(20) DEFAULT '' NOT NULL,
        rg character varying(20),
        telefone character varying(40) NOT NULL,
        telefone_alternativo character varying(40),
        email character varying(160),
        endereco character varying(240),
        bairro character varying(120),
        cidade character varying(120),
        uf character varying(2),
        cep character varying(20),
        trabalho character varying(160),
        responsavel_principal boolean DEFAULT false NOT NULL,
        autorizado_retirada boolean DEFAULT true NOT NULL,
        observacoes text,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_frequencias (
        id uuid PRIMARY KEY,
        crianca_id uuid NOT NULL REFERENCES creche_criancas(id) ON DELETE CASCADE,
        turma_id uuid NOT NULL REFERENCES creche_turmas(id),
        data date NOT NULL,
        presente boolean DEFAULT true NOT NULL,
        justificativa text,
        registrado_por character varying(160),
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL,
        UNIQUE (crianca_id, data)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS creche_acompanhamentos (
        id uuid PRIMARY KEY,
        crianca_id uuid NOT NULL REFERENCES creche_criancas(id) ON DELETE CASCADE,
        tipo character varying NOT NULL,
        status character varying NOT NULL,
        descricao text NOT NULL,
        responsavel character varying NOT NULL,
        data date NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS escola_migracoes_legado (
        chave character varying(120) PRIMARY KEY,
        detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
        concluida_em timestamp without time zone DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS creche_professoras_nome_key ON creche_professoras(nome)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_criancas_turma ON creche_criancas(turma_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_criancas_status ON creche_criancas(status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_responsaveis_crianca ON creche_responsaveis(crianca_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_frequencias_turma_data ON creche_frequencias(turma_id, data)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_frequencias_crianca_data ON creche_frequencias(crianca_id, data)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_creche_acompanhamentos_crianca ON creche_acompanhamentos(crianca_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS escola_migracoes_legado`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_acompanhamentos`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_frequencias`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_responsaveis`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_criancas`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_turmas`);
    await queryRunner.query(`DROP TABLE IF EXISTS creche_professoras`);
  }
}
