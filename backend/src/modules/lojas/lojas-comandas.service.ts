import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import {
  AdicionarItemDto,
  AtualizarStatusComandaDto,
  CriarComandaDto,
  PagamentoItemDto,
  RegistrarPagamentoDto,
} from './dto/lojas-operacao.dto';
import { LojasCatalogoService } from './lojas-catalogo.service';
import { LojasClientesService } from './lojas-clientes.service';
import { LojasEventsService } from './lojas-events.service';
import { LojasRetiradasService } from './lojas-retiradas.service';
import { LojasSchemaService } from './lojas-schema.service';
import { asMoney, ComandaDetalhe, LojasComandaResumo, normalizeStatus, periodoRange } from './lojas-shared';

type AdicionarItemPayload = AdicionarItemDto & {
  usuario?: string;
  lancadoPor?: string;
};

interface ProdutoItemRow {
  id: string;
  nome: string;
  categoria?: string | null;
  preco?: number | null;
}

@Injectable()
export class LojasComandasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly schema: LojasSchemaService,
    private readonly catalogo: LojasCatalogoService,
    private readonly clientes: LojasClientesService,
    private readonly retiradas: LojasRetiradasService,
    private readonly events: LojasEventsService,
  ) {}

  async getComandas(filters?: { status?: string; lojaSlug?: string; periodo?: string }): Promise<LojasComandaResumo[]> {
    await this.schema.ensureEstrutura();

    const params: unknown[] = [];
    const where: string[] = [];
    let lojaSlugParam: string | null = null;

    if (filters?.status === 'ativas' || filters?.status === 'pendentes') {
      where.push(`c.status IN ('aberta', 'aguardando_pagamento')`);
      where.push(`GREATEST(COALESCE(i.total, 0) - COALESCE(p.pago, 0), 0) > 0.01`);
    } else if (filters?.status === 'recentes') {
      const range = periodoRange(filters.periodo);
      params.push(range.inicio, range.fim);
      where.push(`
        COALESCE(c.finalizada_em, c.updated_at, c.created_at) >= $${params.length - 1}::date
        AND COALESCE(c.finalizada_em, c.updated_at, c.created_at) < $${params.length}::date
      `);
    } else if (filters?.status) {
      params.push(normalizeStatus(filters.status));
      where.push(`c.status = $${params.length}`);
    }

    if (filters?.lojaSlug) {
      params.push(filters.lojaSlug);
      lojaSlugParam = `$${params.length}`;
      where.push(`EXISTS (
        SELECT 1
        FROM comercio_comanda_itens filtro_i
        JOIN comercio_lojas filtro_l ON filtro_l.id = filtro_i.loja_id
        WHERE filtro_i.comanda_id = c.id AND filtro_l.slug = ${lojaSlugParam}
      )`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    return this.dataSource.query(
      `
        WITH itens AS (
          SELECT
            i.comanda_id,
            SUM(i.total_item)::numeric(12,2) AS total,
            COUNT(*)::int AS itens,
            string_agg(DISTINCT l.nome, ', ' ORDER BY l.nome) AS lojas
          FROM comercio_comanda_itens i
          JOIN comercio_lojas l ON l.id = i.loja_id
          GROUP BY i.comanda_id
        ),
        pagamentos AS (
          SELECT
            comanda_id,
            SUM(valor)::numeric(12,2) AS pago
          FROM comercio_pagamentos
          GROUP BY comanda_id
        ),
        retiradas AS (
          SELECT
            comanda_id,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'aguardando_retirada')::int AS pendentes,
            COUNT(*) FILTER (WHERE status = 'retirado')::int AS concluidas
          FROM comercio_retiradas
          GROUP BY comanda_id
        ),
        loja_itens AS (
          SELECT
            i.comanda_id,
            i.loja_id AS loja_id,
            SUM(i.total_item)::numeric(12,2) AS total,
            COUNT(*)::int AS itens
          FROM comercio_comanda_itens i
          JOIN comercio_lojas l ON l.id = i.loja_id
          ${lojaSlugParam ? `WHERE l.slug = ${lojaSlugParam}` : 'WHERE false'}
          GROUP BY i.comanda_id, i.loja_id
        )
        SELECT
          c.id,
          c.codigo,
          c.status,
          c.criada_por AS "criadaPor",
          c.observacoes,
          c.motivo_status AS "motivoStatus",
          to_char(c.created_at, 'YYYY-MM-DD HH24:MI') AS "criadaEm",
          to_char(c.updated_at, 'YYYY-MM-DD HH24:MI') AS "atualizadaEm",
          to_char(c.finalizada_em, 'YYYY-MM-DD HH24:MI') AS "finalizadaEm",
          cli.id AS "clienteId",
          cli.nome AS cliente,
          cli.telefone AS "clienteTelefone",
          COALESCE(i.total, 0)::float AS total,
          COALESCE(p.pago, 0)::float AS pago,
          GREATEST(COALESCE(i.total, 0) - COALESCE(p.pago, 0), 0)::float AS saldo,
          COALESCE(i.itens, 0)::int AS itens,
          COALESCE(i.lojas, '') AS lojas,
          ${lojaSlugParam ? 'COALESCE(li.total, 0)::float' : 'NULL::float'} AS "totalLoja",
          ${lojaSlugParam ? 'COALESCE(li.itens, 0)::int' : 'NULL::int'} AS "itensLoja",
          ${lojaSlugParam ? 'r.id::text' : 'NULL::text'} AS "retiradaId",
          ${lojaSlugParam ? 'r.status' : 'NULL::text'} AS "retiradaStatus",
          ${lojaSlugParam ? "to_char(r.notificada_em, 'YYYY-MM-DD HH24:MI')" : 'NULL::text'} AS "retiradaNotificadaEm",
          ${lojaSlugParam ? "to_char(r.retirada_em, 'YYYY-MM-DD HH24:MI')" : 'NULL::text'} AS "retiradaEm",
          ${lojaSlugParam ? 'r.entregue_por' : 'NULL::text'} AS "retiradaEntreguePor",
          COALESCE(rt.total, 0)::int AS "retiradasTotal",
          COALESCE(rt.pendentes, 0)::int AS "retiradasPendentes",
          COALESCE(rt.concluidas, 0)::int AS "retiradasConcluidas"
        FROM comercio_comandas c
        JOIN comercio_clientes cli ON cli.id = c.cliente_id
        LEFT JOIN itens i ON i.comanda_id = c.id
        LEFT JOIN pagamentos p ON p.comanda_id = c.id
        LEFT JOIN retiradas rt ON rt.comanda_id = c.id
        LEFT JOIN loja_itens li ON li.comanda_id = c.id
        LEFT JOIN comercio_retiradas r ON r.comanda_id = c.id AND r.loja_id = li.loja_id
        ${whereSql}
        ORDER BY c.updated_at DESC, c.created_at DESC
        LIMIT 80
      `,
      params,
    ) as Promise<LojasComandaResumo[]>;
  }

  async createComanda(body: CriarComandaDto): Promise<ComandaDetalhe> {
    await this.schema.ensureEstrutura();

    const clienteId = await this.clientes.resolveClienteId(body);
    const [existente] = await this.dataSource.query(
      `
        SELECT id
        FROM comercio_comandas
        WHERE cliente_id = $1::uuid
          AND status IN ('aberta', 'aguardando_pagamento')
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [clienteId],
    ) as Array<{ id: string }>;

    if (existente?.id) {
      return this.getComandaDetalhe(existente.id);
    }

    const [proximo] = await this.dataSource.query(`
      SELECT
        COALESCE(MAX(NULLIF(regexp_replace(codigo, '\\D', '', 'g'), '')::int), 0) + 1 AS numero
      FROM comercio_comandas
    `) as Array<{ numero: number | string }>;

    const id = randomUUID();
    const codigo = `CMD${String(Number(proximo?.numero || 1)).padStart(5, '0')}`;

    await this.dataSource.query(
      `
        INSERT INTO comercio_comandas (
          id, codigo, cliente_id, status, criada_por, observacoes, created_at, updated_at
        )
        VALUES ($1, $2, $3::uuid, 'aberta', $4, $5, NOW(), NOW())
      `,
      [id, codigo, clienteId, body.criadaPor || body.usuario || 'Sistema local', body.observacoes || null],
    );

    await this.events.registrarEvento(id, 'comanda_criada', 'Comanda criada para venda prevista.', body.criadaPor || body.usuario);

    const detalhe = await this.getComandaDetalhe(id);
    this.events.emitLojas('comanda_criada', { comandaId: id, codigo, cliente: detalhe.cliente });
    this.events.emitComandaAtualizada(detalhe);

    return detalhe;
  }

  async getComandaDetalhe(id: string, lojaSlug?: string): Promise<ComandaDetalhe> {
    await this.schema.ensureEstrutura();

    const [comanda] = await this.dataSource.query(
      `
        WITH itens AS (
          SELECT
            comanda_id,
            SUM(total_item)::numeric(12,2) AS total,
            COUNT(*)::int AS itens
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
        SELECT
          c.id,
          c.codigo,
          c.status,
          c.criada_por AS "criadaPor",
          c.observacoes,
          c.motivo_status AS "motivoStatus",
          to_char(c.created_at, 'YYYY-MM-DD HH24:MI') AS "criadaEm",
          to_char(c.updated_at, 'YYYY-MM-DD HH24:MI') AS "atualizadaEm",
          to_char(c.finalizada_em, 'YYYY-MM-DD HH24:MI') AS "finalizadaEm",
          cli.id AS "clienteId",
          cli.nome AS cliente,
          cli.telefone AS "clienteTelefone",
          cli.cpf AS "clienteCpf",
          cli.email AS "clienteEmail",
          COALESCE(i.total, 0)::float AS total,
          COALESCE(p.pago, 0)::float AS pago,
          GREATEST(COALESCE(i.total, 0) - COALESCE(p.pago, 0), 0)::float AS saldo,
          COALESCE(i.itens, 0)::int AS itens
        FROM comercio_comandas c
        JOIN comercio_clientes cli ON cli.id = c.cliente_id
        LEFT JOIN itens i ON i.comanda_id = c.id
        LEFT JOIN pagamentos p ON p.comanda_id = c.id
        WHERE c.id::text = $1 OR c.codigo = $1
      `,
      [id],
    ) as ComandaDetalhe[];

    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada.');
    }

    const lojaFilterSql = lojaSlug ? 'AND l.slug = $2' : '';
    const lojaFilterParams = lojaSlug ? [comanda.id, lojaSlug] : [comanda.id];

    const itens = await this.dataSource.query(
      `
        SELECT
          i.id,
          i.descricao,
          i.categoria,
          i.quantidade,
          i.valor_unitario::float AS "valorUnitario",
          i.desconto::float AS desconto,
          i.total_item::float AS total,
          l.id AS "lojaId",
          l.slug AS "lojaSlug",
          l.nome AS loja,
          p.id AS "produtoId",
          p.nome AS produto
        FROM comercio_comanda_itens i
        JOIN comercio_lojas l ON l.id = i.loja_id
        LEFT JOIN comercio_produtos p ON p.id = i.produto_id
        WHERE i.comanda_id = $1::uuid
          ${lojaFilterSql}
        ORDER BY i.created_at, i.descricao
      `,
      lojaFilterParams,
    );

    const pagamentos = await this.dataSource.query(
      `
        SELECT
          id,
          metodo,
          valor::float AS valor,
          recebido_por AS "recebidoPor",
          observacoes,
          to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "criadoEm"
        FROM comercio_pagamentos
        WHERE comanda_id = $1::uuid
        ORDER BY created_at
      `,
      [comanda.id],
    );

    const totaisPorLoja = await this.dataSource.query(
      `
        SELECT
          l.slug,
          l.nome,
          SUM(i.total_item)::float AS total,
          COUNT(*)::int AS itens
        FROM comercio_comanda_itens i
        JOIN comercio_lojas l ON l.id = i.loja_id
        WHERE i.comanda_id = $1::uuid
          ${lojaFilterSql}
        GROUP BY l.id, l.slug, l.nome
        ORDER BY l.nome
      `,
      lojaFilterParams,
    );

    const retiradasPorLoja = await this.dataSource.query(
      `
        SELECT
          r.id,
          r.comanda_id AS "comandaId",
          l.slug AS "lojaSlug",
          l.nome AS loja,
          r.status,
          to_char(r.notificada_em, 'YYYY-MM-DD HH24:MI') AS "notificadaEm",
          to_char(r.retirada_em, 'YYYY-MM-DD HH24:MI') AS "retiradaEm",
          r.entregue_por AS "entreguePor",
          r.observacoes
        FROM comercio_retiradas r
        JOIN comercio_lojas l ON l.id = r.loja_id
        WHERE r.comanda_id = $1::uuid
          ${lojaSlug ? 'AND l.slug = $2' : ''}
        ORDER BY l.nome
      `,
      lojaFilterParams,
    );

    return {
      ...comanda,
      total: asMoney(comanda.total),
      pago: asMoney(comanda.pago),
      saldo: asMoney(comanda.saldo),
      itens,
      pagamentos: lojaSlug ? [] : pagamentos,
      totaisPorLoja,
      retiradasPorLoja,
      retirada: lojaSlug ? (retiradasPorLoja[0] || null) : null,
    };
  }

  async addItem(comandaId: string, body: AdicionarItemPayload): Promise<ComandaDetalhe> {
    await this.schema.ensureEstrutura();

    if (!body?.descricao?.trim() && !body?.produtoId) {
      throw new BadRequestException('Informe o produto ou a descrição do item.');
    }

    const loja = await this.catalogo.resolveLoja(body.lojaSlug, body.lojaId);
    const quantidade = Math.max(1, Number(body.quantidade || 1));
    const valorUnitario = asMoney(body.valorUnitario ?? body.preco);
    const desconto = Math.max(0, asMoney(body.desconto));

    if (!valorUnitario) {
      throw new BadRequestException('Valor unitário é obrigatório.');
    }

    const [produto] = body.produtoId
      ? await this.dataSource.query(
          `
            SELECT id, nome, categoria, preco::float AS preco
            FROM comercio_produtos
            WHERE id = $1::uuid
          `,
          [body.produtoId],
        ) as ProdutoItemRow[]
      : [null];

    const descricao = body.descricao?.trim() || produto?.nome;
    const categoria = body.categoria?.trim() || produto?.categoria || 'Diversos';
    const total = Math.max(0, quantidade * valorUnitario - desconto);

    await this.assertComandaOperavel(comandaId);

    await this.dataSource.query(
      `
        INSERT INTO comercio_comanda_itens (
          id, comanda_id, loja_id, produto_id, descricao, categoria, quantidade,
          valor_unitario, desconto, total_item, created_at
        )
        VALUES ($1, $2::uuid, $3::uuid, NULLIF($4, '')::uuid, $5, $6, $7, $8, $9, $10, NOW())
      `,
      [
        randomUUID(),
        comandaId,
        loja.id,
        produto?.id || body.produtoId || '',
        descricao,
        categoria,
        quantidade,
        valorUnitario,
        desconto,
        total,
      ],
    );

    await this.dataSource.query(
      `
        UPDATE comercio_comandas
        SET status = CASE WHEN status = 'aberta' THEN 'aguardando_pagamento' ELSE status END,
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [comandaId],
    );

    await this.events.registrarEvento(
      comandaId,
      'item_adicionado',
      `${loja.nome} adicionou ${quantidade} item(ns) à comanda.`,
      body.usuario || body.lancadoPor,
      { loja: loja.slug, descricao: descricao || '', total },
    );

    const detalhe = await this.getComandaDetalhe(comandaId);
    this.events.emitLojas('item_adicionado', { comandaId, loja: loja.slug, total });
    this.events.emitComandaAtualizada(detalhe);

    return detalhe;
  }

  async removeItem(comandaId: string, itemId: string, lojaSlugPermitido?: string): Promise<ComandaDetalhe> {
    await this.schema.ensureEstrutura();
    await this.assertComandaOperavel(comandaId);

    const result = await this.dataSource.query(
      `
        DELETE FROM comercio_comanda_itens
        WHERE id = $1::uuid AND comanda_id = $2::uuid
          AND ($3::varchar IS NULL OR loja_id = (
            SELECT id FROM comercio_lojas WHERE slug = $3::varchar
          ))
        RETURNING id
      `,
      [itemId, comandaId, lojaSlugPermitido || null],
    );
    const removido = Array.isArray(result?.[0]) ? result[0][0] : result?.[0];

    if (!removido) {
      throw new NotFoundException('Item não encontrado ou fora do escopo da loja.');
    }

    await this.dataSource.query(
      `
        UPDATE comercio_comandas
        SET updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [comandaId],
    );

    await this.events.registrarEvento(comandaId, 'item_removido', 'Item removido da comanda.');

    const detalhe = await this.getComandaDetalhe(comandaId);
    this.events.emitLojas('item_removido', { comandaId, itemId });
    this.events.emitComandaAtualizada(detalhe);

    return detalhe;
  }

  async registrarPagamento(comandaId: string, body: RegistrarPagamentoDto): Promise<ComandaDetalhe> {
    await this.schema.ensureEstrutura();

    const detalhe = await this.getComandaDetalhe(comandaId);

    if (['paga', 'desistencia', 'cancelada', 'expirada'].includes(detalhe.status)) {
      throw new BadRequestException('Esta comanda não aceita novos pagamentos.');
    }

    const pagamentosPayload = Array.isArray(body?.pagamentos) ? body.pagamentos : [];
    const pagamentos = pagamentosPayload
      .map((pagamento: PagamentoItemDto) => ({
        metodo: String(pagamento.metodo || '').trim(),
        valor: asMoney(pagamento.valor),
      }))
      .filter((pagamento) => pagamento.metodo && pagamento.valor > 0);

    if (!pagamentos.length) {
      throw new BadRequestException('Informe ao menos um pagamento com valor.');
    }

    const totalNovosPagamentos = pagamentos.reduce((sum, pagamento) => sum + pagamento.valor, 0);

    if (totalNovosPagamentos > detalhe.saldo + 0.01) {
      throw new BadRequestException('O valor informado ultrapassa o saldo da comanda.');
    }

    const saldoAposPagamento = asMoney(detalhe.saldo - totalNovosPagamentos);
    const novoStatus = saldoAposPagamento <= 0.01 ? 'paga' : 'aguardando_pagamento';
    const eventoTipo = novoStatus === 'paga' ? 'comanda_paga' : 'pagamento_parcial';
    const eventoDescricao = novoStatus === 'paga'
      ? 'Comanda paga e finalizada.'
      : 'Pagamento parcial registrado.';
    const usuarioEvento = body.recebidoPor || body.usuario || 'Secretaria';
    let retiradasLiberadas = [] as Awaited<ReturnType<LojasRetiradasService['criarRetiradasPendentes']>>;

    await this.dataSource.transaction(async (manager) => {
      for (const pagamento of pagamentos) {
        await manager.query(
          `
            INSERT INTO comercio_pagamentos (
              id, comanda_id, metodo, valor, recebido_por, observacoes, created_at
            )
            VALUES ($1, $2::uuid, $3, $4, $5, $6, NOW())
          `,
          [
            randomUUID(),
            comandaId,
            pagamento.metodo,
            pagamento.valor,
            body.recebidoPor || body.usuario || 'Secretaria',
            body.observacoes || null,
          ],
        );
      }

      await manager.query(
        `
          UPDATE comercio_comandas
          SET status = $2::varchar,
              finalizada_em = CASE
                WHEN $2::varchar = 'paga' THEN COALESCE(finalizada_em, NOW())
                ELSE finalizada_em
              END,
              updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [comandaId, novoStatus],
      );

      await manager.query(
        `
          INSERT INTO comercio_eventos_comanda (
            id, comanda_id, tipo, descricao, usuario, metadata, created_at
          )
          VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, NOW())
        `,
        [
          randomUUID(),
          comandaId,
          eventoTipo,
          eventoDescricao,
          usuarioEvento,
          JSON.stringify({ total: totalNovosPagamentos }),
        ],
      );

      if (novoStatus === 'paga') {
        retiradasLiberadas = await this.retiradas.criarRetiradasPendentes(comandaId, manager, usuarioEvento);
      }
    });

    const detalheFinal = await this.getComandaDetalhe(comandaId);
    this.events.emitLojas(novoStatus === 'paga' ? 'comanda_paga' : 'pagamento_parcial', { comandaId, total: totalNovosPagamentos });
    retiradasLiberadas.forEach((retirada) => {
      this.events.emitRetiradaAtualizada(retirada);
    });
    this.events.emitComandaAtualizada(detalheFinal);

    return detalheFinal;
  }

  async updateStatus(comandaId: string, body: AtualizarStatusComandaDto): Promise<ComandaDetalhe> {
    await this.schema.ensureEstrutura();
    const status = normalizeStatus(body?.status);

    if (!['desistencia', 'cancelada', 'expirada', 'aguardando_pagamento', 'aberta'].includes(status)) {
      throw new BadRequestException('Status não permitido para esta ação.');
    }

    await this.dataSource.query(
      `
        UPDATE comercio_comandas
        SET status = $2,
            motivo_status = $3,
            finalizada_em = CASE WHEN $2 IN ('desistencia', 'cancelada', 'expirada') THEN NOW() ELSE finalizada_em END,
            updated_at = NOW()
        WHERE id = $1::uuid
      `,
      [comandaId, status, body?.motivo || body?.observacoes || null],
    );

    await this.events.registrarEvento(
      comandaId,
      `status_${status}`,
      body?.motivo || `Comanda alterada para ${status}.`,
      body?.usuario,
    );

    const detalhe = await this.getComandaDetalhe(comandaId);
    this.events.emitLojas(`status_${status}`, { comandaId, status });
    this.events.emitComandaAtualizada(detalhe);

    return detalhe;
  }

  private async assertComandaOperavel(comandaId: string) {
    const [comanda] = await this.dataSource.query(
      `
        SELECT id, status
        FROM comercio_comandas
        WHERE id = $1::uuid
      `,
      [comandaId],
    ) as Array<{ id: string; status: string }>;

    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada.');
    }

    if (['paga', 'desistencia', 'cancelada', 'expirada'].includes(comanda.status)) {
      throw new BadRequestException('Esta comanda já foi finalizada.');
    }
  }
}
