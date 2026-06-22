import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { CORE_DATABASE_CONNECTION } from '../../config/database.config';
import { EEI_TURMAS, EEI_TURMA_ORDER_SQL, firstReturnedRow } from './creche-shared';

@Injectable()
export class CrecheSchemaService {
  private estruturaEeiPronta = false;
  private estruturaEeiPromise: Promise<void> | null = null;

  constructor(@InjectDataSource(CORE_DATABASE_CONNECTION) private readonly dataSource: DataSource) {}

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
    await this.dataSource.query(
      `
        CREATE TABLE IF NOT EXISTS creche_acompanhamentos (
          id uuid PRIMARY KEY,
          crianca_id uuid NOT NULL REFERENCES creche_criancas(id) ON DELETE CASCADE,
          tipo varchar NOT NULL,
          status varchar NOT NULL,
          descricao text NOT NULL,
          responsavel varchar NOT NULL,
          data date NOT NULL,
          created_at timestamp NOT NULL,
          updated_at timestamp NOT NULL
        )
      `,
    );
  }

  private async ensureEstruturaEeiInternal() {
    await this.dataSource.query(
      `
        CREATE TABLE IF NOT EXISTS creche_professoras (
          id uuid PRIMARY KEY,
          nome varchar(160) NOT NULL,
          telefone varchar(40),
          email varchar(160),
          funcao varchar(80) NOT NULL DEFAULT 'Regente',
          status varchar(30) NOT NULL DEFAULT 'ativa',
          observacoes text,
          created_at timestamp NOT NULL DEFAULT NOW(),
          updated_at timestamp NOT NULL DEFAULT NOW()
        )
      `,
    );

    await this.dataSource.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS creche_professoras_nome_key
        ON creche_professoras (nome)
      `,
    );

    await this.dataSource.query(
      `
        ALTER TABLE creche_turmas
        ADD COLUMN IF NOT EXISTS professora_responsavel_id uuid
      `,
    );

    await this.dataSource.query(
      `
        ALTER TABLE creche_professoras
        ALTER COLUMN funcao SET DEFAULT 'Regente'
      `,
    );

    await this.dataSource.query(
      `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'creche_turmas_professora_responsavel_id_fkey'
          ) THEN
            ALTER TABLE creche_turmas
            ADD CONSTRAINT creche_turmas_professora_responsavel_id_fkey
            FOREIGN KEY (professora_responsavel_id)
            REFERENCES creche_professoras(id)
            ON DELETE SET NULL;
          END IF;
        END
        $$;
      `,
    );

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
