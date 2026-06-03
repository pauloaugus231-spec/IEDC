import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { LOJAS_OFICIAIS, QueryRunnerLike } from './lojas-shared';

@Injectable()
export class LojasSchemaService {
  private estruturaPronta = false;
  private estruturaPromise: Promise<void> | null = null;

  constructor(private readonly dataSource: DataSource) {}

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
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_lojas (
        id uuid PRIMARY KEY,
        slug varchar(40) UNIQUE NOT NULL,
        nome varchar(120) NOT NULL,
        ativa boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_clientes (
        id uuid PRIMARY KEY,
        nome varchar(180) NOT NULL,
        telefone varchar(40) NOT NULL DEFAULT '',
        cpf varchar(20) NOT NULL DEFAULT '',
        email varchar(180) NOT NULL DEFAULT '',
        endereco varchar(240) NOT NULL DEFAULT '',
        data_nascimento date NULL,
        observacoes text NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await this.dataSource.query(`
      ALTER TABLE comercio_clientes
      ADD COLUMN IF NOT EXISTS endereco varchar(240) NOT NULL DEFAULT ''
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_produtos (
        id uuid PRIMARY KEY,
        loja_id uuid NOT NULL REFERENCES comercio_lojas(id),
        nome varchar(180) NOT NULL,
        categoria varchar(120) NOT NULL DEFAULT 'Diversos',
        preco numeric(10,2) NOT NULL DEFAULT 0,
        ativo boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_comandas (
        id uuid PRIMARY KEY,
        codigo varchar(30) UNIQUE NOT NULL,
        cliente_id uuid NOT NULL REFERENCES comercio_clientes(id),
        status varchar(40) NOT NULL DEFAULT 'aberta',
        criada_por varchar(160) NULL,
        observacoes text NULL,
        motivo_status text NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        finalizada_em timestamp NULL
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_comanda_itens (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercio_comandas(id) ON DELETE CASCADE,
        loja_id uuid NOT NULL REFERENCES comercio_lojas(id),
        produto_id uuid NULL REFERENCES comercio_produtos(id),
        descricao varchar(220) NOT NULL,
        categoria varchar(120) NOT NULL DEFAULT 'Diversos',
        quantidade integer NOT NULL DEFAULT 1,
        valor_unitario numeric(10,2) NOT NULL DEFAULT 0,
        desconto numeric(10,2) NOT NULL DEFAULT 0,
        total_item numeric(10,2) NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_pagamentos (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercio_comandas(id) ON DELETE CASCADE,
        metodo varchar(40) NOT NULL,
        valor numeric(10,2) NOT NULL DEFAULT 0,
        recebido_por varchar(160) NULL,
        observacoes text NULL,
        created_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_eventos_comanda (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercio_comandas(id) ON DELETE CASCADE,
        tipo varchar(80) NOT NULL,
        descricao text NOT NULL,
        usuario varchar(160) NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_retiradas (
        id uuid PRIMARY KEY,
        comanda_id uuid NOT NULL REFERENCES comercio_comandas(id) ON DELETE CASCADE,
        loja_id uuid NOT NULL REFERENCES comercio_lojas(id),
        status varchar(40) NOT NULL DEFAULT 'aguardando_retirada',
        notificada_em timestamp NOT NULL DEFAULT NOW(),
        retirada_em timestamp NULL,
        entregue_por varchar(160) NULL,
        observacoes text NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW(),
        UNIQUE (comanda_id, loja_id)
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_caixas (
        id uuid PRIMARY KEY,
        codigo varchar(40) UNIQUE NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'aberto',
        aberto_por varchar(160) NULL,
        fechado_por varchar(160) NULL,
        saldo_inicial numeric(12,2) NOT NULL DEFAULT 0,
        total_sistema numeric(12,2) NOT NULL DEFAULT 0,
        total_conferido numeric(12,2) NOT NULL DEFAULT 0,
        diferenca numeric(12,2) NOT NULL DEFAULT 0,
        comandas_pagas integer NOT NULL DEFAULT 0,
        comandas_desistidas integer NOT NULL DEFAULT 0,
        observacoes_abertura text NULL,
        observacoes_fechamento text NULL,
        aberto_em timestamp NOT NULL DEFAULT NOW(),
        fechado_em timestamp NULL,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS comercio_caixa_metodos (
        id uuid PRIMARY KEY,
        caixa_id uuid NOT NULL REFERENCES comercio_caixas(id) ON DELETE CASCADE,
        metodo varchar(80) NOT NULL,
        valor_sistema numeric(12,2) NOT NULL DEFAULT 0,
        valor_informado numeric(12,2) NOT NULL DEFAULT 0,
        diferenca numeric(12,2) NOT NULL DEFAULT 0,
        quantidade_pagamentos integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT NOW(),
        UNIQUE (caixa_id, metodo)
      )
    `);

    await this.dataSource.query(`
      ALTER TABLE comercio_pagamentos
      ADD COLUMN IF NOT EXISTS caixa_id uuid NULL REFERENCES comercio_caixas(id)
    `);

    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_comercio_comandas_status ON comercio_comandas(status);
      CREATE INDEX IF NOT EXISTS idx_comercio_comandas_cliente ON comercio_comandas(cliente_id);
      CREATE INDEX IF NOT EXISTS idx_comercio_itens_comanda ON comercio_comanda_itens(comanda_id);
      CREATE INDEX IF NOT EXISTS idx_comercio_pagamentos_comanda ON comercio_pagamentos(comanda_id);
      CREATE INDEX IF NOT EXISTS idx_comercio_pagamentos_caixa ON comercio_pagamentos(caixa_id);
      CREATE INDEX IF NOT EXISTS idx_comercio_caixas_status ON comercio_caixas(status);
      CREATE INDEX IF NOT EXISTS idx_comercio_retiradas_loja_status ON comercio_retiradas(loja_id, status);
      CREATE INDEX IF NOT EXISTS idx_comercio_retiradas_comanda ON comercio_retiradas(comanda_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uidx_comercio_clientes_cpf_digits
        ON comercio_clientes ((regexp_replace(cpf, '\\D', '', 'g')))
        WHERE regexp_replace(cpf, '\\D', '', 'g') <> '';
    `);

    await this.seedDadosIniciais();
    await this.corrigirComandasQuitadas();
    await this.criarRetiradasPendentesParaComandasPagas();
  }

  private async corrigirComandasQuitadas() {
    await this.dataSource.query(`
      WITH itens AS (
        SELECT
          comanda_id,
          SUM(total_item)::numeric(12,2) AS total
        FROM comercio_comanda_itens
        GROUP BY comanda_id
      ),
      pagamentos AS (
        SELECT
          comanda_id,
          SUM(valor)::numeric(12,2) AS pago
        FROM comercio_pagamentos
        GROUP BY comanda_id
      )
      UPDATE comercio_comandas c
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
      FROM comercio_comandas c
      JOIN comercio_comanda_itens i ON i.comanda_id = c.id
      LEFT JOIN comercio_retiradas r ON r.comanda_id = c.id AND r.loja_id = i.loja_id
      WHERE c.status = 'paga'
        AND r.id IS NULL
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
        SELECT
          c.id AS "comandaId",
          c.codigo,
          cli.nome AS cliente,
          cli.telefone AS "clienteTelefone",
          l.id AS "lojaId",
          l.slug AS "lojaSlug",
          l.nome AS loja,
          SUM(i.total_item)::numeric(12,2) AS total,
          COUNT(*)::int AS itens
        FROM comercio_comandas c
        JOIN comercio_clientes cli ON cli.id = c.cliente_id
        JOIN comercio_comanda_itens i ON i.comanda_id = c.id
        JOIN comercio_lojas l ON l.id = i.loja_id
        WHERE c.id = $1::uuid
          AND c.status = 'paga'
        GROUP BY c.id, c.codigo, cli.nome, cli.telefone, l.id, l.slug, l.nome
      `,
      [comandaId],
    );

    for (const loja of lojas as Array<{ lojaId: string; loja: string; lojaSlug: string }>) {
      const retiradaId = randomUUID();
      const inserted = await runner.query(
        `
          INSERT INTO comercio_retiradas (
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
            INSERT INTO comercio_eventos_comanda (
              id, comanda_id, tipo, descricao, usuario, metadata, created_at
            )
            VALUES ($1, $2::uuid, 'retirada_liberada', $3, $4, $5::jsonb, NOW())
          `,
          [
            randomUUID(),
            comandaId,
            `${loja.loja} liberado para retirada após pagamento.`,
            usuario || 'Secretaria',
            JSON.stringify({ loja: loja.lojaSlug, retiradaId }),
          ],
        );
      }
    }
  }

  private async seedDadosIniciais() {
    const lojasIds: Record<string, string> = {};

    for (const loja of LOJAS_OFICIAIS) {
      const id = randomUUID();
      await this.dataSource.query(
        `
          INSERT INTO comercio_lojas (id, slug, nome, ativa, created_at, updated_at)
          VALUES ($1, $2, $3, true, NOW(), NOW())
          ON CONFLICT (slug) DO UPDATE
          SET nome = EXCLUDED.nome,
              ativa = true,
              updated_at = NOW()
        `,
        [id, loja.slug, loja.nome],
      );

      const [row] = await this.dataSource.query(`SELECT id FROM comercio_lojas WHERE slug = $1`, [loja.slug]);
      lojasIds[loja.slug] = row.id;
    }
  }
}
