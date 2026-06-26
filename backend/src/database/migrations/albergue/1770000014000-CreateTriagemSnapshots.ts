import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriagemSnapshots1770000014000 implements MigrationInterface {
  name = 'CreateTriagemSnapshots1770000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS triagem_fechamentos (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        data_ref date NOT NULL,
        fechada_em timestamp NOT NULL,
        fechada_por varchar(100) NOT NULL,
        total_presentes integer DEFAULT 0 NOT NULL,
        total_ausentes integer DEFAULT 0 NOT NULL,
        por_quarto jsonb DEFAULT '{}'::jsonb NOT NULL,
        ausentes_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
        resultado_processamento jsonb DEFAULT '{}'::jsonb NOT NULL,
        observacoes text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT uq_triagem_fechamentos_data_ref UNIQUE (data_ref)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ocupacao_diaria (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        data_ref date NOT NULL,
        ocupadas integer DEFAULT 0 NOT NULL,
        capacidade integer DEFAULT 0 NOT NULL,
        percentual integer DEFAULT 0 NOT NULL,
        ingressos integer DEFAULT 0 NOT NULL,
        saidas integer DEFAULT 0 NOT NULL,
        ocupadas_por_casa jsonb DEFAULT '{}'::jsonb NOT NULL,
        capacidade_por_casa jsonb DEFAULT '{}'::jsonb NOT NULL,
        inconsistente boolean DEFAULT false NOT NULL,
        alertas jsonb DEFAULT '[]'::jsonb NOT NULL,
        origem varchar(50) DEFAULT 'triagem' NOT NULL,
        gerado_em timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT uq_ocupacao_diaria_data_ref UNIQUE (data_ref)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_triagem_fechamentos_data_ref ON triagem_fechamentos(data_ref)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ocupacao_diaria_data_ref ON ocupacao_diaria(data_ref)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ocupacao_diaria`);
    await queryRunner.query(`DROP TABLE IF EXISTS triagem_fechamentos`);
  }
}
