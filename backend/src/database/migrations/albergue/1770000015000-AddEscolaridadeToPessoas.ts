import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEscolaridadeToPessoas1770000015000 implements MigrationInterface {
  name = 'AddEscolaridadeToPessoas1770000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS escolaridade varchar(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE pessoas DROP COLUMN IF EXISTS escolaridade`,
    );
  }
}
