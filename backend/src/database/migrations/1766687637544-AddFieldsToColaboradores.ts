import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFieldsToColaboradores1766687637544 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE colaboradores 
            ADD COLUMN IF NOT EXISTS unidade VARCHAR(50) DEFAULT 'Geral',
            ADD COLUMN IF NOT EXISTS equipe VARCHAR(50) DEFAULT 'A',
            ADD COLUMN IF NOT EXISTS regime VARCHAR(20) DEFAULT '12x36'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE colaboradores 
            DROP COLUMN IF EXISTS unidade,
            DROP COLUMN IF EXISTS equipe,
            DROP COLUMN IF EXISTS regime
        `);
    }

}
