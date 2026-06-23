import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import {
  CORE_DATABASE_CONNECTION,
  ESCOLA_DATABASE_CONNECTION,
} from '../../config/database.config';

type LegacyRow = Record<string, unknown>;

@Injectable()
export class EscolaLegacyMigrationService {
  private readonly logger = new Logger(EscolaLegacyMigrationService.name);
  private readonly migrationKey = 'core_creche_para_escola_v1';

  constructor(
    @InjectDataSource(CORE_DATABASE_CONNECTION) private readonly core: DataSource,
    @InjectDataSource(ESCOLA_DATABASE_CONNECTION) private readonly escola: DataSource,
  ) {}

  async migrateIfNeeded(): Promise<void> {
    const [legacy] = await this.core.query(
      `SELECT to_regclass('public.creche_turmas')::text AS tabela`,
    ) as Array<{ tabela: string | null }>;

    if (!legacy?.tabela) {
      return;
    }

    const runner = this.escola.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.query(`SELECT pg_advisory_xact_lock(7249013602)`);
      const [completed] = await runner.query(
        `SELECT chave FROM escola_migracoes_legado WHERE chave = $1`,
        [this.migrationKey],
      );

      if (completed) {
        await runner.commitTransaction();
        return;
      }

      const counts = await this.copyLegacyData(runner);
      await runner.query(
        `
          INSERT INTO escola_migracoes_legado (chave, detalhes, concluida_em)
          VALUES ($1, $2::jsonb, NOW())
        `,
        [this.migrationKey, JSON.stringify(counts)],
      );
      await runner.commitTransaction();
      this.logger.log(`Migracao da Escola para iedc_escola concluida: ${JSON.stringify(counts)}`);
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async copyLegacyData(runner: QueryRunner) {
    const professoras = await this.readLegacyTable('creche_professoras');
    const turmas = await this.readLegacyTable('creche_turmas');
    const criancas = await this.readLegacyTable('creche_criancas');
    const responsaveis = await this.readLegacyTable('creche_responsaveis');
    const frequencias = await this.readLegacyTable('creche_frequencias');
    const acompanhamentos = await this.readLegacyTable('creche_acompanhamentos');

    await this.insertRows(runner, 'creche_professoras', [
      'id', 'nome', 'telefone', 'email', 'funcao', 'status', 'observacoes',
      'created_at', 'updated_at',
    ], professoras);

    await this.insertRows(runner, 'creche_turmas', [
      'id', 'nome', 'faixa_etaria', 'turno', 'capacidade', 'ativa',
      'professora_responsavel_id', 'created_at', 'updated_at',
    ], turmas);

    await this.insertRows(runner, 'creche_criancas', [
      'id', 'codigo', 'nome', 'cpf', 'rg', 'nis', 'data_nascimento', 'data_ingresso',
      'turma_id', 'status', 'sexo', 'genero', 'raca_cor', 'naturalidade', 'endereco',
      'bairro', 'cidade', 'uf', 'cep', 'escola_origem', 'alergias', 'condicoes_saude',
      'medicamentos', 'autorizacao_imagem', 'observacoes', 'created_at', 'updated_at',
    ], criancas);

    await this.insertRows(runner, 'creche_responsaveis', [
      'id', 'crianca_id', 'nome', 'parentesco', 'cpf', 'rg', 'telefone',
      'telefone_alternativo', 'email', 'endereco', 'bairro', 'cidade', 'uf', 'cep',
      'trabalho', 'responsavel_principal', 'autorizado_retirada', 'observacoes',
      'created_at', 'updated_at',
    ], responsaveis);

    await this.insertRows(runner, 'creche_frequencias', [
      'id', 'crianca_id', 'turma_id', 'data', 'presente', 'justificativa',
      'registrado_por', 'created_at', 'updated_at',
    ], frequencias);

    await this.insertRows(runner, 'creche_acompanhamentos', [
      'id', 'crianca_id', 'tipo', 'status', 'descricao', 'responsavel', 'data',
      'created_at', 'updated_at',
    ], acompanhamentos);

    return {
      professoras: professoras.length,
      turmas: turmas.length,
      criancas: criancas.length,
      responsaveis: responsaveis.length,
      frequencias: frequencias.length,
      acompanhamentos: acompanhamentos.length,
    };
  }

  private async readLegacyTable(table: string): Promise<LegacyRow[]> {
    const [exists] = await this.core.query(
      `SELECT to_regclass($1)::text AS tabela`,
      [`public.${table}`],
    ) as Array<{ tabela: string | null }>;

    if (!exists?.tabela) {
      return [];
    }

    return this.core.query(`SELECT * FROM ${table}`);
  }

  private async insertRows(
    runner: QueryRunner,
    table: string,
    columns: string[],
    rows: LegacyRow[],
  ): Promise<void> {
    for (const row of rows) {
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      await runner.query(
        `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `,
        columns.map((column) => row[column] ?? null),
      );
    }
  }
}
