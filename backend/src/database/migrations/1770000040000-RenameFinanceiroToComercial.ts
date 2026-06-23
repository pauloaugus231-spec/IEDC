import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameFinanceiroToComercial1770000040000 implements MigrationInterface {
  name = 'RenameFinanceiroToComercial1770000040000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios ALTER COLUMN role TYPE varchar USING role::text`);
    await queryRunner.query(`ALTER TABLE usuarios ALTER COLUMN service TYPE varchar USING service::text`);
    await queryRunner.query(`DROP TYPE usuarios_role_enum`);
    await queryRunner.query(`DROP TYPE usuarios_service_enum`);
    await queryRunner.query(`
      CREATE TYPE usuarios_role_enum AS ENUM (
        'gestora', 'suporte', 'coordenador_albergue', 'coordenador_creche',
        'equipe_tecnica', 'educador_albergue', 'educador_creche', 'comercial',
        'loja_bazar', 'loja_brecho', 'loja_feirao'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE usuarios_service_enum AS ENUM (
        'gestao', 'suporte', 'albergue', 'creche', 'institucional', 'comercial',
        'bazar', 'brecho', 'feirao'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE usuarios ALTER COLUMN role TYPE usuarios_role_enum
      USING (CASE WHEN role = 'financeiro' THEN 'comercial' ELSE role END)::usuarios_role_enum
    `);
    await queryRunner.query(`
      ALTER TABLE usuarios ALTER COLUMN service TYPE usuarios_service_enum
      USING (CASE WHEN service = 'financeiro' THEN 'comercial' ELSE service END)::usuarios_service_enum
    `);
    await queryRunner.query(`
      UPDATE usuarios
      SET "roleLabel" = 'Comercial',
          "serviceLabel" = 'Operacao comercial das lojas',
          atualizado_em = NOW()
      WHERE role = 'comercial'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios ALTER COLUMN role TYPE varchar USING role::text`);
    await queryRunner.query(`ALTER TABLE usuarios ALTER COLUMN service TYPE varchar USING service::text`);
    await queryRunner.query(`DROP TYPE usuarios_role_enum`);
    await queryRunner.query(`DROP TYPE usuarios_service_enum`);
    await queryRunner.query(`
      CREATE TYPE usuarios_role_enum AS ENUM (
        'gestora', 'suporte', 'coordenador_albergue', 'coordenador_creche',
        'equipe_tecnica', 'educador_albergue', 'educador_creche', 'financeiro',
        'loja_bazar', 'loja_brecho', 'loja_feirao'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE usuarios_service_enum AS ENUM (
        'gestao', 'suporte', 'albergue', 'creche', 'institucional', 'financeiro',
        'bazar', 'brecho', 'feirao'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE usuarios ALTER COLUMN role TYPE usuarios_role_enum
      USING (CASE WHEN role = 'comercial' THEN 'financeiro' ELSE role END)::usuarios_role_enum
    `);
    await queryRunner.query(`
      ALTER TABLE usuarios ALTER COLUMN service TYPE usuarios_service_enum
      USING (CASE WHEN service = 'comercial' THEN 'financeiro' ELSE service END)::usuarios_service_enum
    `);
  }
}
