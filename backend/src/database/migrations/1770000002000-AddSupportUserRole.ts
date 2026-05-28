import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportUserRole1770000002000 implements MigrationInterface {
  name = 'AddSupportUserRole1770000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE usuarios_role_enum ADD VALUE IF NOT EXISTS 'suporte'`);
    await queryRunner.query(`ALTER TYPE usuarios_service_enum ADD VALUE IF NOT EXISTS 'suporte'`);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing enum values safely without rebuilding the type.
  }
}
