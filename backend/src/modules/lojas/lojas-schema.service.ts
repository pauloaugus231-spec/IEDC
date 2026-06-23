import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { MASTER_DATABASE_CONNECTION } from '../../config/database.config';
import { LojasLegacyMigrationService } from './lojas-legacy-migration.service';
import { LOJAS_OFICIAIS, QueryRunnerLike } from './lojas-shared';

@Injectable()
export class LojasSchemaService implements OnModuleInit {
  private estruturaPronta = false;
  private estruturaPromise: Promise<void> | null = null;

  constructor(
    @InjectDataSource(MASTER_DATABASE_CONNECTION) private readonly dataSource: DataSource,
    private readonly legacyMigration: LojasLegacyMigrationService,
  ) {}

  async onModuleInit() {
    await this.ensureEstrutura();
  }

  async ensureEstrutura() {
    if (this.estruturaPronta) {
      return;
    }

    if (!this.estruturaPromise) {
      this.estruturaPromise = this.ensureEstruturaInterna()
        .then(() => {
          this.estruturaPronta = true;
        })
        .finally(() => {
          this.estruturaPromise = null;
        });
    }

    return this.estruturaPromise;
  }

  private async ensureEstruturaInterna() {
    const [schema] = await this.dataSource.query(
      `SELECT to_regclass('comercial.comandas')::text AS tabela`,
    ) as Array<{ tabela: string | null }>;

    if (!schema?.tabela) {
      throw new Error(
        'O schema do iedc_master nao foi criado. Habilite DB_MIGRATIONS_RUN antes de iniciar o backend.',
      );
    }

    await this.legacyMigration.migrateIfNeeded();
    await this.seedDadosIniciais();
    await this.corrigirComandasQuitadas();
    await this.criarRetiradasPendentesParaComandasPagas();
  }

  private async corrigirComandasQuitadas() {
    await this.dataSource.query(`
      WITH itens AS (
        SELECT comanda_id, SUM(total_item)::numeric(12,2) AS total
        FROM comercial.comanda_itens
        GROUP BY comanda_id
      ),
      pagamentos AS (
        SELECT comanda_id, SUM(valor)::numeric(12,2) AS pago
        FROM comercial.pagamentos
        GROUP BY comanda_id
      )
      UPDATE comercial.comandas c
      SET status = 'paga',
          finalizada_em = COALESCE(c.finalizada_em, NOW()),
          updated_at = NOW()
      FROM itens i
      LEFT JOIN pagamentos p ON p.comanda_id = i.comanda_id
      WHERE c.id = i.comanda_id
        AND c.status IN ('aberta', 'aguardando_pagamento')
        AND i.total > 0
        AND COALESCE(p.pago, 0) >= i.total - 0.01
    `);
  }

  private async criarRetiradasPendentesParaComandasPagas() {
    const comandas = await this.dataSource.query(`
      SELECT DISTINCT c.id
      FROM comercial.comandas c
      JOIN comercial.comanda_itens i ON i.comanda_id = c.id
      LEFT JOIN comercial.retiradas r ON r.comanda_id = c.id AND r.loja_id = i.loja_id
      WHERE c.status = 'paga' AND r.id IS NULL
    `);

    for (const comanda of comandas as Array<{ id: string }>) {
      await this.criarRetiradasPendentes(comanda.id, this.dataSource, 'Sistema local');
    }
  }

  private async criarRetiradasPendentes(
    comandaId: string,
    runner: QueryRunnerLike = this.dataSource,
    usuario?: string,
  ) {
    const lojas = await runner.query(
      `
        SELECT l.id AS "lojaId", l.slug AS "lojaSlug", l.nome AS loja
        FROM comercial.comandas c
        JOIN comercial.comanda_itens i ON i.comanda_id = c.id
        JOIN comercial.lojas l ON l.id = i.loja_id
        WHERE c.id = $1::uuid AND c.status = 'paga'
        GROUP BY l.id, l.slug, l.nome
      `,
      [comandaId],
    );

    for (const loja of lojas as Array<{ lojaId: string; loja: string; lojaSlug: string }>) {
      const retiradaId = randomUUID();
      const inserted = await runner.query(
        `
          INSERT INTO comercial.retiradas (
            id, comanda_id, loja_id, status, notificada_em, created_at, updated_at
          )
          VALUES ($1, $2::uuid, $3::uuid, 'aguardando_retirada', NOW(), NOW(), NOW())
          ON CONFLICT (comanda_id, loja_id) DO NOTHING
          RETURNING id
        `,
        [retiradaId, comandaId, loja.lojaId],
      );

      if (inserted.length) {
        await runner.query(
          `
            INSERT INTO comercial.eventos_comanda (
              id, comanda_id, tipo, descricao, usuario, metadata, created_at
            )
            VALUES ($1, $2::uuid, 'retirada_liberada', $3, $4, $5::jsonb, NOW())
          `,
          [
            randomUUID(),
            comandaId,
            `${loja.loja} liberado para retirada apos pagamento.`,
            usuario || 'Comercial',
            JSON.stringify({ loja: loja.lojaSlug, retiradaId }),
          ],
        );
      }
    }
  }

  private async seedDadosIniciais() {
    for (const loja of LOJAS_OFICIAIS) {
      await this.dataSource.query(
        `
          INSERT INTO comercial.lojas (id, slug, nome, ativa, created_at, updated_at)
          VALUES ($1, $2, $3, true, NOW(), NOW())
          ON CONFLICT (slug) DO UPDATE
          SET nome = EXCLUDED.nome, ativa = true, updated_at = NOW()
        `,
        [randomUUID(), loja.slug, loja.nome],
      );
    }
  }
}
