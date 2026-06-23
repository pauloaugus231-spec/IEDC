import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MASTER_DATABASE_CONNECTION } from '../../config/database.config';
import { ConfirmarRetiradaDto } from './dto/lojas-operacao.dto';
import { LojasEventsService } from './lojas-events.service';
import { LojasSchemaService } from './lojas-schema.service';
import { LojaVendaRow, periodoRange, QueryRunnerLike, RetiradaComercial } from './lojas-shared';

@Injectable()
export class LojasRetiradasService {
  constructor(
    @InjectDataSource(MASTER_DATABASE_CONNECTION) private readonly dataSource: DataSource,
    private readonly schema: LojasSchemaService,
    private readonly events: LojasEventsService,
  ) {}

  async getRetiradas(filters?: { lojaSlug?: string; status?: string; periodo?: string }): Promise<RetiradaComercial[]> {
    await this.schema.ensureEstrutura();

    const params: unknown[] = [];
    const where: string[] = [];

    if (filters?.lojaSlug) {
      params.push(filters.lojaSlug);
      where.push(`l.slug = $${params.length}`);
    }

    if (filters?.status === 'pendentes' || filters?.status === 'aguardando_retirada') {
      where.push(`r.status = 'aguardando_retirada'`);
    } else if (filters?.status === 'retirado') {
      where.push(`r.status = 'retirado'`);
    }

    if (filters?.status !== 'pendentes' && filters?.status !== 'aguardando_retirada') {
      const range = periodoRange(filters?.periodo);
      params.push(range.inicio, range.fim);
      where.push(`
        r.updated_at >= $${params.length - 1}::date
        AND r.updated_at < $${params.length}::date
      `);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    return this.dataSource.query(
      `
        WITH itens AS (
          SELECT
            i.comanda_id,
            i.loja_id,
            SUM(i.total_item)::numeric(12,2) AS total,
            COUNT(*)::int AS itens
          FROM comercial.comanda_itens i
          GROUP BY i.comanda_id, i.loja_id
        )
        SELECT
          r.id,
          r.comanda_id AS "comandaId",
          c.codigo,
          c.status AS "comandaStatus",
          cli.id AS "clienteId",
          c.nome_pessoa_snapshot AS cliente,
          cli.telefone AS "clienteTelefone",
          l.slug AS "lojaSlug",
          l.nome AS loja,
          r.status,
          to_char(r.notificada_em, 'YYYY-MM-DD HH24:MI') AS "notificadaEm",
          to_char(r.retirada_em, 'YYYY-MM-DD HH24:MI') AS "retiradaEm",
          r.entregue_por AS "entreguePor",
          r.observacoes,
          COALESCE(i.total, 0)::float AS total,
          COALESCE(i.itens, 0)::int AS itens
        FROM comercial.retiradas r
        JOIN comercial.comandas c ON c.id = r.comanda_id
        JOIN comercial.clientes cli ON cli.id = c.pessoa_id
        JOIN comercial.lojas l ON l.id = r.loja_id
        LEFT JOIN itens i ON i.comanda_id = r.comanda_id AND i.loja_id = r.loja_id
        ${whereSql}
        ORDER BY
          CASE WHEN r.status = 'aguardando_retirada' THEN 0 ELSE 1 END,
          r.updated_at DESC,
          r.notificada_em DESC
        LIMIT 120
      `,
      params,
    ) as Promise<RetiradaComercial[]>;
  }

  async confirmarRetirada(id: string, body: ConfirmarRetiradaDto): Promise<RetiradaComercial> {
    await this.schema.ensureEstrutura();

    const retirada = await this.getRetiradaById(id);

    if (!retirada) {
      throw new NotFoundException('Retirada não encontrada.');
    }

    if (body?.lojaSlugPermitido && retirada.lojaSlug !== body.lojaSlugPermitido) {
      throw new ForbiddenException('Este perfil não pode confirmar retirada de outra loja.');
    }

    if (retirada.status !== 'retirado') {
      await this.dataSource.query(
        `
          UPDATE comercial.retiradas
          SET status = 'retirado',
              retirada_em = NOW(),
              entregue_por = $2,
              observacoes = $3,
              updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [
          id,
          body?.entreguePor || body?.usuario || 'Loja',
          body?.observacoes || null,
        ],
      );

      await this.events.registrarEvento(
        retirada.comandaId,
        'retirada_confirmada',
        `${retirada.loja} confirmou a retirada do pedido.`,
        body?.entreguePor || body?.usuario,
        { loja: retirada.lojaSlug, retiradaId: id },
      );
    }

    const atualizada = await this.getRetiradaById(id);
    if (!atualizada) {
      throw new NotFoundException('Retirada não encontrada após atualização.');
    }

    this.events.emitLojas('retirada_confirmada', {
      retiradaId: id,
      comandaId: atualizada.comandaId,
      codigo: atualizada.codigo,
      loja: atualizada.lojaSlug,
    });
    this.events.emitRetiradaAtualizada(atualizada);

    return atualizada;
  }

  async getRetiradaById(id: string): Promise<RetiradaComercial | null> {
    const [retirada] = await this.dataSource.query(
      `
        WITH itens AS (
          SELECT
            i.comanda_id,
            i.loja_id,
            SUM(i.total_item)::numeric(12,2) AS total,
            COUNT(*)::int AS itens
          FROM comercial.comanda_itens i
          GROUP BY i.comanda_id, i.loja_id
        )
        SELECT
          r.id,
          r.comanda_id AS "comandaId",
          c.codigo,
          c.status AS "comandaStatus",
          cli.id AS "clienteId",
          c.nome_pessoa_snapshot AS cliente,
          cli.telefone AS "clienteTelefone",
          l.slug AS "lojaSlug",
          l.nome AS loja,
          r.status,
          to_char(r.notificada_em, 'YYYY-MM-DD HH24:MI') AS "notificadaEm",
          to_char(r.retirada_em, 'YYYY-MM-DD HH24:MI') AS "retiradaEm",
          r.entregue_por AS "entreguePor",
          r.observacoes,
          COALESCE(i.total, 0)::float AS total,
          COALESCE(i.itens, 0)::int AS itens
        FROM comercial.retiradas r
        JOIN comercial.comandas c ON c.id = r.comanda_id
        JOIN comercial.clientes cli ON cli.id = c.pessoa_id
        JOIN comercial.lojas l ON l.id = r.loja_id
        LEFT JOIN itens i ON i.comanda_id = r.comanda_id AND i.loja_id = r.loja_id
        WHERE r.id = $1::uuid
      `,
      [id],
    ) as RetiradaComercial[];

    return retirada || null;
  }

  async criarRetiradasPendentes(
    comandaId: string,
    runner: QueryRunnerLike = this.dataSource,
    usuario?: string,
  ) {
    const lojas = await runner.query(
      `
        SELECT
          c.id AS "comandaId",
          c.codigo,
          c.nome_pessoa_snapshot AS cliente,
          cli.telefone AS "clienteTelefone",
          l.id AS "lojaId",
          l.slug AS "lojaSlug",
          l.nome AS loja,
          SUM(i.total_item)::numeric(12,2) AS total,
          COUNT(*)::int AS itens
        FROM comercial.comandas c
        JOIN comercial.clientes cli ON cli.id = c.pessoa_id
        JOIN comercial.comanda_itens i ON i.comanda_id = c.id
        JOIN comercial.lojas l ON l.id = i.loja_id
        WHERE c.id = $1::uuid
          AND c.status = 'paga'
        GROUP BY c.id, c.codigo, c.nome_pessoa_snapshot, cli.telefone, l.id, l.slug, l.nome
      `,
      [comandaId],
    ) as LojaVendaRow[];

    const retiradas: RetiradaComercial[] = [];

    for (const loja of lojas) {
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

      const [retirada] = await runner.query(
        `
          SELECT
            r.id,
            r.comanda_id AS "comandaId",
            $2 AS codigo,
            'paga' AS "comandaStatus",
            $3 AS cliente,
            $4 AS "clienteTelefone",
            $5 AS "lojaSlug",
            $6 AS loja,
            r.status,
            to_char(r.notificada_em, 'YYYY-MM-DD HH24:MI') AS "notificadaEm",
            to_char(r.retirada_em, 'YYYY-MM-DD HH24:MI') AS "retiradaEm",
            r.entregue_por AS "entreguePor",
            r.observacoes,
            $7::float AS total,
            $8::int AS itens
          FROM comercial.retiradas r
          WHERE r.comanda_id = $1::uuid AND r.loja_id = $9::uuid
        `,
        [
          comandaId,
          loja.codigo,
          loja.cliente,
          loja.clienteTelefone,
          loja.lojaSlug,
          loja.loja,
          Number(loja.total || 0),
          Number(loja.itens || 0),
          loja.lojaId,
        ],
      ) as RetiradaComercial[];

      if (inserted.length && retirada) {
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
            `${loja.loja} liberado para retirada após pagamento.`,
            usuario || 'Secretaria',
            JSON.stringify({ loja: loja.lojaSlug, retiradaId: retirada.id }),
          ],
        );
      }

      if (retirada?.status === 'aguardando_retirada') {
        retiradas.push(retirada);
      }
    }

    return retiradas;
  }
}
