import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTipoEstadiaToEstadias1770000013000 implements MigrationInterface {
  name = 'AddTipoEstadiaToEstadias1770000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createEnum(queryRunner, 'estadias_tipo_estadia_enum', ['completa', 'pernoite']);

    await queryRunner.query(`
      ALTER TABLE estadias
      ADD COLUMN IF NOT EXISTS tipo_estadia estadias_tipo_estadia_enum NOT NULL DEFAULT 'completa'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE estadias DROP COLUMN IF EXISTS tipo_estadia`);
    await queryRunner.query(`DROP TYPE IF EXISTS "estadias_tipo_estadia_enum"`);
  }

  private async createEnum(queryRunner: QueryRunner, name: string, values: string[]): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = $1`,
      [name],
    );

    if (exists.length > 0) {
      return;
    }

    const sqlValues = values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
    await queryRunner.query(`CREATE TYPE "${name}" AS ENUM (${sqlValues})`);
  }
}
