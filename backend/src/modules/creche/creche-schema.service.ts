import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ESCOLA_DATABASE_CONNECTION } from '../../config/database.config';
import { EEI_TURMAS, EEI_TURMA_ORDER_SQL, firstReturnedRow } from './creche-shared';
import { EscolaLegacyMigrationService } from './escola-legacy-migration.service';

@Injectable()
export class CrecheSchemaService implements OnModuleInit {
  private estruturaEeiPronta = false;
  private estruturaEeiPromise: Promise<void> | null = null;

  constructor(
    @InjectDataSource(ESCOLA_DATABASE_CONNECTION) private readonly dataSource: DataSource,
    private readonly legacyMigration: EscolaLegacyMigrationService,
  ) {}

  async onModuleInit() {
    await this.ensureEstruturaEei();
  }

  async ensureEstruturaEei() {
    if (this.estruturaEeiPronta) {
      return;
    }

    if (this.estruturaEeiPromise) {
      await this.estruturaEeiPromise;
      return;
    }

    this.estruturaEeiPromise = this.ensureEstruturaEeiInternal();

    try {
      await this.estruturaEeiPromise;
      this.estruturaEeiPronta = true;
    } finally {
      this.estruturaEeiPromise = null;
    }
  }

  async ensureAcompanhamentosTable() {
    await this.ensureEstruturaEei();
  }

  private async ensureEstruturaEeiInternal() {
    const [schema] = await this.dataSource.query(
      `SELECT to_regclass('public.creche_turmas')::text AS tabela`,
    ) as Array<{ tabela: string | null }>;

    if (!schema?.tabela) {
      throw new Error(
        'O schema do iedc_escola nao foi criado. Habilite DB_MIGRATIONS_RUN antes de iniciar o backend.',
      );
    }

    await this.legacyMigration.migrateIfNeeded();

    for (const [index, turma] of EEI_TURMAS.entries()) {
      const professoraResult = await this.dataSource.query(
        `
          INSERT INTO creche_professoras (
            id,
            nome,
            funcao,
            status,
            observacoes,
            created_at,
            updated_at
          )
          VALUES ($1, $2, 'Regente', 'ativa', $3, NOW(), NOW())
          ON CONFLICT (nome)
          DO UPDATE SET
            funcao = EXCLUDED.funcao,
            status = EXCLUDED.status,
            observacoes = COALESCE(creche_professoras.observacoes, EXCLUDED.observacoes),
            updated_at = NOW()
          RETURNING id
        `,
        [
          randomUUID(),
          turma.professora,
          `Professora responsável por ${turma.nome}.`,
        ],
      );
      const professora = firstReturnedRow<{ id: string }>(professoraResult);

      await this.dataSource.query(
        `
          INSERT INTO creche_turmas (
            id,
            nome,
            faixa_etaria,
            turno,
            capacidade,
            ativa,
            professora_responsavel_id,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, true, $6::uuid, NOW(), NOW())
          ON CONFLICT (nome)
          DO UPDATE SET
            faixa_etaria = EXCLUDED.faixa_etaria,
            turno = EXCLUDED.turno,
            capacidade = EXCLUDED.capacidade,
            ativa = true,
            professora_responsavel_id = COALESCE(creche_turmas.professora_responsavel_id, EXCLUDED.professora_responsavel_id),
            updated_at = NOW()
        `,
        [
          randomUUID(),
          turma.nome,
          turma.faixaEtaria,
          turma.turno,
          turma.capacidade,
          professora?.id,
        ],
      );

      if (index === EEI_TURMAS.length - 1) {
        await this.dataSource.query(
          `
            UPDATE creche_turmas
            SET ativa = false, updated_at = NOW()
            WHERE NOT (nome = ANY($1::text[]))
          `,
          [EEI_TURMAS.map((item) => item.nome)],
        );
      }
    }

    await this.dataSource.query(
      `
        WITH alvo AS (
          SELECT
            c.id,
            ROW_NUMBER() OVER (ORDER BY c.data_nascimento DESC, c.nome) AS linha,
            COUNT(*) OVER () AS total
          FROM creche_criancas c
          LEFT JOIN creche_turmas atual ON atual.id = c.turma_id
          WHERE c.status = 'ativa'
            AND NOT (COALESCE(atual.nome, '') = ANY($1::text[]))
        ),
        novas_turmas AS (
          SELECT
            t.id,
            ROW_NUMBER() OVER (ORDER BY ${EEI_TURMA_ORDER_SQL}, t.nome) AS linha
          FROM creche_turmas t
          WHERE t.nome = ANY($1::text[])
        )
        UPDATE creche_criancas c
        SET turma_id = nt.id, updated_at = NOW()
        FROM alvo a
        JOIN novas_turmas nt
          ON nt.linha = LEAST(
            ${EEI_TURMAS.length},
            FLOOR(((a.linha - 1) * ${EEI_TURMAS.length}.0) / NULLIF(a.total, 0))::int + 1
          )
        WHERE c.id = a.id
      `,
      [EEI_TURMAS.map((item) => item.nome)],
    );
  }
}
