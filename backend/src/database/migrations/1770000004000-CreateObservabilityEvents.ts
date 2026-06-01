import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateObservabilityEvents1770000004000 implements MigrationInterface {
  name = 'CreateObservabilityEvents1770000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS observability_events (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        tipo character varying(40) NOT NULL,
        origem character varying(40) NOT NULL,
        nivel character varying(16) DEFAULT 'info' NOT NULL,
        mensagem character varying(240) NOT NULL,
        "requestId" character varying(120),
        "usuarioLogin" character varying(80),
        "usuarioRole" character varying(80),
        "httpStatus" integer,
        "durationMs" integer,
        metadata jsonb,
        criado_em timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_observability_events_id" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_observability_events_criado_em ON observability_events (criado_em)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_observability_events_tipo_nivel ON observability_events (tipo, nivel)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_observability_events_origem ON observability_events (origem)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_observability_events_origem`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_observability_events_tipo_nivel`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_observability_events_criado_em`);
    await queryRunner.query(`DROP TABLE IF EXISTS observability_events`);
  }
}
