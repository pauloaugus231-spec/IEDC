import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateImpactoAlbergueRespostas1770000017000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS impacto_albergue_respostas (
        id uuid PRIMARY KEY,
        source_key varchar(120) UNIQUE NOT NULL,
        origem varchar(40) NOT NULL DEFAULT 'sistema',
        data_referencia date NOT NULL,
        situacao_territorial varchar(160) NOT NULL DEFAULT 'Ñ informado',
        tempo_sem_moradia varchar(160) NOT NULL DEFAULT 'Prefiro não responder',
        fatores_sem_moradia text[] NOT NULL DEFAULT ARRAY[]::text[],
        fatores_sem_moradia_outro text NULL,
        ajuda_principal text[] NOT NULL DEFAULT ARRAY[]::text[],
        ajuda_principal_outro text NULL,
        respeito_usuarios varchar(60) NOT NULL DEFAULT 'Prefiro não responder',
        comunicacao_equipe varchar(60) NOT NULL DEFAULT 'Não se aplica',
        proximo_passo_ajuda varchar(60) NOT NULL DEFAULT 'Ainda não',
        proximos_passos text[] NOT NULL DEFAULT ARRAY[]::text[],
        proximo_passo_outro text NULL,
        participou_oficina varchar(80) NOT NULL DEFAULT 'Não',
        relato_representa text NULL,
        melhoria_sugerida text NULL,
        demandas_equipe text[] NOT NULL DEFAULT ARRAY[]::text[],
        demanda_outro text NULL,
        acao_equipe text[] NOT NULL DEFAULT ARRAY[]::text[],
        preenchido_por varchar(160) NULL,
        perfil_preenchedor varchar(80) NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_impacto_albergue_data ON impacto_albergue_respostas(data_referencia)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_impacto_albergue_origem ON impacto_albergue_respostas(origem)
    `);

    // Tabela de controle de migracoes de dado legado vindo do Core — mesmo
    // padrao usado por escola_migracoes_legado e comercial.migracoes_legado.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS albergue_migracoes_legado (
        chave character varying(120) PRIMARY KEY,
        detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
        concluida_em timestamp without time zone DEFAULT now() NOT NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS albergue_migracoes_legado`);
    await queryRunner.query(`DROP TABLE IF EXISTS impacto_albergue_respostas`);
  }
}
