import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPresenteFieldToPessoa1757574656817 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pessoas" ADD "presente" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pessoas" DROP COLUMN "presente"`);
    }

}
