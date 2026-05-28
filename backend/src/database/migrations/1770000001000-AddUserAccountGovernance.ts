import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAccountGovernance1770000001000 implements MigrationInterface {
  name = 'AddUserAccountGovernance1770000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean DEFAULT true NOT NULL`);
    await queryRunner.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "passwordUpdatedAt" timestamp without time zone`);
    await queryRunner.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "lastLoginAt" timestamp without time zone`);
    await queryRunner.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "createdBy" character varying(80)`);
    await queryRunner.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "updatedBy" character varying(80)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS "updatedBy"`);
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS "createdBy"`);
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS "lastLoginAt"`);
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS "passwordUpdatedAt"`);
    await queryRunner.query(`ALTER TABLE usuarios DROP COLUMN IF EXISTS "mustChangePassword"`);
  }
}
