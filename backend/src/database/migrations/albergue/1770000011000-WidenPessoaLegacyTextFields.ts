import { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenPessoaLegacyTextFields1770000011000 implements MigrationInterface {
  name = 'WidenPessoaLegacyTextFields1770000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN cpf TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN rg TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN nis TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN naturalidade TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN telefone TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN sexo TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN genero TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN cor TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN raca TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN sexualidade TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN cidade TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN cep TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN nome_mae TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN nome_pai TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN contato_emergencia TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN telefone_emergencia TYPE varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN telefone_emergencia TYPE varchar(20)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN contato_emergencia TYPE varchar(100)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN nome_pai TYPE varchar(100)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN nome_mae TYPE varchar(100)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN cep TYPE varchar(20)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN cidade TYPE varchar(100)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN sexualidade TYPE varchar(50)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN raca TYPE varchar(50)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN cor TYPE varchar(50)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN genero TYPE varchar(50)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN sexo TYPE varchar(20)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN telefone TYPE varchar(20)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN naturalidade TYPE varchar(100)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN nis TYPE varchar(20)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN rg TYPE varchar(20)`);
    await queryRunner.query(`ALTER TABLE pessoas ALTER COLUMN cpf TYPE varchar(20)`);
  }
}
