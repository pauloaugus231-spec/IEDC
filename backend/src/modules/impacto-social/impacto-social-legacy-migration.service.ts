import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { CORE_DATABASE_CONNECTION } from '../../config/database.config';

type LegacyRow = Record<string, unknown>;

const COLUNAS_IMPACTO = [
  'id',
  'source_key',
  'origem',
  'data_referencia',
  'situacao_territorial',
  'tempo_sem_moradia',
  'fatores_sem_moradia',
  'fatores_sem_moradia_outro',
  'ajuda_principal',
  'ajuda_principal_outro',
  'respeito_usuarios',
  'comunicacao_equipe',
  'proximo_passo_ajuda',
  'proximos_passos',
  'proximo_passo_outro',
  'participou_oficina',
  'relato_representa',
  'melhoria_sugerida',
  'demandas_equipe',
  'demanda_outro',
  'acao_equipe',
  'preenchido_por',
  'perfil_preenchedor',
  'created_at',
  'updated_at',
];

const COLUNAS_ARRAY = new Set([
  'fatores_sem_moradia',
  'ajuda_principal',
  'proximos_passos',
  'demandas_equipe',
  'acao_equipe',
]);

/**
 * Copia, uma unica vez, as respostas do formulario de Impacto Social que
 * ainda estejam na tabela legada do Core (iedc) para o banco proprio do
 * Albergue (iedc_albergue) — mesmo padrao ja usado para tirar o comercio das
 * Lojas e a Creche/Escola de dentro do Core (LojasLegacyMigrationService e
 * EscolaLegacyMigrationService).
 *
 * A tabela antiga em Core NAO e apagada por aqui — fica como historico ate
 * uma limpeza deliberada, mesma prudencia dos outros dois migradores.
 */
@Injectable()
export class ImpactoSocialLegacyMigrationService {
  private readonly logger = new Logger(ImpactoSocialLegacyMigrationService.name);
  private readonly migrationKey = 'core_impacto_social_para_albergue_v1';

  constructor(
    @InjectDataSource(CORE_DATABASE_CONNECTION) private readonly core: DataSource,
    @InjectDataSource() private readonly albergue: DataSource,
  ) {}

  async migrateIfNeeded(): Promise<void> {
    const [legacy] = (await this.core.query(
      `SELECT to_regclass('public.impacto_albergue_respostas')::text AS tabela`,
    )) as Array<{ tabela: string | null }>;

    if (!legacy?.tabela) {
      return;
    }

    const runner = this.albergue.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.query(`SELECT pg_advisory_xact_lock(7249013603)`);
      const [completed] = await runner.query(
        `SELECT chave FROM albergue_migracoes_legado WHERE chave = $1`,
        [this.migrationKey],
      );

      if (completed) {
        await runner.commitTransaction();
        return;
      }

      const total = await this.copyLegacyData(runner);
      await runner.query(
        `
          INSERT INTO albergue_migracoes_legado (chave, detalhes, concluida_em)
          VALUES ($1, $2::jsonb, NOW())
        `,
        [this.migrationKey, JSON.stringify({ respostas: total })],
      );
      await runner.commitTransaction();
      this.logger.log(`Migracao de Impacto Social para iedc_albergue concluida: ${total} resposta(s).`);
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async copyLegacyData(runner: QueryRunner): Promise<number> {
    const respostas = await this.readLegacyRespostas();

    for (const row of respostas) {
      const placeholders = COLUNAS_IMPACTO.map((coluna, index) => {
        const posicao = `$${index + 1}`;
        if (coluna === 'data_referencia') return `${posicao}::date`;
        if (COLUNAS_ARRAY.has(coluna)) return `${posicao}::text[]`;
        return posicao;
      }).join(', ');

      await runner.query(
        `
          INSERT INTO impacto_albergue_respostas (${COLUNAS_IMPACTO.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (source_key) DO NOTHING
        `,
        COLUNAS_IMPACTO.map((coluna) => row[coluna] ?? null),
      );
    }

    return respostas.length;
  }

  private async readLegacyRespostas(): Promise<LegacyRow[]> {
    return this.core.query(`SELECT ${COLUNAS_IMPACTO.join(', ')} FROM impacto_albergue_respostas`);
  }
}
