import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLog1770000003000 implements MigrationInterface {
  name = 'CreateAuditLog1770000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id uuid DEFAULT uuid_generate_v4() NOT NULL,
        acao character varying(140) NOT NULL,
        entidade character varying(80) NOT NULL,
        "entidadeId" character varying(120),
        "usuarioId" character varying(120),
        "usuarioLogin" character varying(80),
        "usuarioRole" character varying(80),
        ip character varying(45),
        "userAgent" character varying(260),
        status character varying(12) DEFAULT 'sucesso' NOT NULL,
        "httpStatus" integer,
        metadata jsonb,
        criado_em timestamp without time zone DEFAULT now() NOT NULL,
        CONSTRAINT "PK_auditoria_id" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em ON auditoria (criado_em)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON auditoria (entidade, "entidadeId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria ("usuarioLogin")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_auditoria_usuario`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_auditoria_entidade`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_auditoria_criado_em`);
    await queryRunner.query(`DROP TABLE IF EXISTS auditoria`);
  }
}
