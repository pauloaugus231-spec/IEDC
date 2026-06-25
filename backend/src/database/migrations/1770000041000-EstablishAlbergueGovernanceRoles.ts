import { MigrationInterface, QueryRunner } from 'typeorm';

export class EstablishAlbergueGovernanceRoles1770000041000 implements MigrationInterface {
  name = 'EstablishAlbergueGovernanceRoles1770000041000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios ALTER COLUMN role TYPE varchar USING role::text`);
    await queryRunner.query(`ALTER TABLE usuarios ALTER COLUMN service TYPE varchar USING service::text`);
    await queryRunner.query(`DROP TYPE usuarios_role_enum`);
    await queryRunner.query(`DROP TYPE usuarios_service_enum`);
    await queryRunner.query(`
      CREATE TYPE usuarios_role_enum AS ENUM (
        'gestora', 'suporte', 'coordenador_albergue', 'auxiliar_coordenacao_albergue',
        'diretor_albergue', 'equipe_tecnica_albergue', 'coordenador_creche',
        'educador_albergue', 'educador_creche', 'comercial',
        'loja_bazar', 'loja_brecho', 'loja_feirao'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE usuarios_service_enum AS ENUM (
        'gestao', 'suporte', 'albergue', 'creche', 'comercial',
        'bazar', 'brecho', 'feirao'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE usuarios ALTER COLUMN role TYPE usuarios_role_enum
      USING (CASE WHEN role = 'equipe_tecnica' THEN 'equipe_tecnica_albergue' ELSE role END)::usuarios_role_enum
    `);
    await queryRunner.query(`
      ALTER TABLE usuarios ALTER COLUMN service TYPE usuarios_service_enum
      USING (CASE WHEN service = 'institucional' THEN 'albergue' ELSE service END)::usuarios_service_enum
    `);
    await queryRunner.query(`
      UPDATE usuarios
      SET "roleLabel" = 'Equipe técnica do Albergue',
          "serviceLabel" = 'Albergue Noturno',
          "homePath" = '/albergue',
          atualizado_em = NOW()
      WHERE role = 'equipe_tecnica_albergue'
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
      USING (
        CASE
          WHEN role = 'equipe_tecnica_albergue' THEN 'equipe_tecnica'
          WHEN role IN ('auxiliar_coordenacao_albergue', 'diretor_albergue') THEN 'coordenador_albergue'
          ELSE role
        END
      )::usuarios_role_enum
    `);
    await queryRunner.query(`
      ALTER TABLE usuarios ALTER COLUMN service TYPE usuarios_service_enum
      USING (CASE WHEN role = 'equipe_tecnica' THEN 'institucional' ELSE service END)::usuarios_service_enum
    `);
    await queryRunner.query(`
      UPDATE usuarios
      SET "roleLabel" = 'Equipe técnica',
          "serviceLabel" = 'Atendimento institucional',
          "homePath" = '/gestao',
          atualizado_em = NOW()
      WHERE role = 'equipe_tecnica'
    `);
  }
}
