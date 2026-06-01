import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationDismissals1770000005000 implements MigrationInterface {
  name = 'CreateNotificationDismissals1770000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notificacoes_encerradas (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        usuario_id character varying(120) NOT NULL,
        usuario_login character varying(80) NOT NULL,
        usuario_role character varying(80) NOT NULL,
        notification_id character varying(160) NOT NULL,
        context_key character varying(20) NOT NULL,
        encerrado_em timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_notificacoes_encerradas" PRIMARY KEY (id),
        CONSTRAINT "UQ_notificacoes_encerradas_usuario_aviso_contexto" UNIQUE (usuario_id, notification_id, context_key)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notificacoes_encerradas_usuario_contexto
      ON notificacoes_encerradas (usuario_id, context_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notificacoes_encerradas_encerrado_em
      ON notificacoes_encerradas (encerrado_em)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notificacoes_encerradas_encerrado_em`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notificacoes_encerradas_usuario_contexto`);
    await queryRunner.query(`DROP TABLE IF EXISTS notificacoes_encerradas`);
  }
}
