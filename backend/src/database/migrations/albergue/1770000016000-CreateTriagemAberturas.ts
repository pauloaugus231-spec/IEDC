import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriagemAberturas1770000016000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS triagem_aberturas (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        data_ref    DATE UNIQUE NOT NULL,
        aberta_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        aberta_por  VARCHAR(100),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS triagem_aberturas`);
  }
}
