import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShareMasterIdentityWithCommercial1770000050000 implements MigrationInterface {
  name = 'ShareMasterIdentityWithCommercial1770000050000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW comercial.clientes AS
      SELECT
        p.id,
        COALESCE(NULLIF(btrim(p.nome_social), ''), p.nome_registro) AS nome,
        p.nome_registro,
        p.nome_social,
        p.telefone,
        p.cpf,
        p.email,
        p.endereco,
        p.data_nascimento,
        perfil.observacoes,
        p.ativo,
        p.created_at,
        GREATEST(p.updated_at, COALESCE(perfil.updated_at, p.updated_at)) AS updated_at
      FROM identidade.pessoas p
      LEFT JOIN comercial.perfis_pessoa perfil ON perfil.pessoa_id = p.id
      WHERE p.ativo = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW comercial.clientes AS
      SELECT
        p.id,
        COALESCE(NULLIF(btrim(p.nome_social), ''), p.nome_registro) AS nome,
        p.nome_registro,
        p.nome_social,
        p.telefone,
        p.cpf,
        p.email,
        p.endereco,
        p.data_nascimento,
        perfil.observacoes,
        p.ativo,
        p.created_at,
        GREATEST(p.updated_at, perfil.updated_at) AS updated_at
      FROM identidade.pessoas p
      JOIN comercial.perfis_pessoa perfil ON perfil.pessoa_id = p.id
    `);
  }
}
