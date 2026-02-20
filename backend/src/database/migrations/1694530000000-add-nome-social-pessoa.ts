import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNomeSocialPessoa1694530000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pessoas" ADD "nome_social" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pessoas" DROP COLUMN "nome_social"`);
    }

}