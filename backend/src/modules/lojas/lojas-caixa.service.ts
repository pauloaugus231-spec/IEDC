import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AbrirCaixaDto, FecharCaixaDto } from './dto/lojas-operacao.dto';
import { LojasEventsService } from './lojas-events.service';
import { LojasSchemaService } from './lojas-schema.service';
import { asMoney } from './lojas-shared';

type CaixaStatus = 'aberto' | 'fechado';

export interface CaixaRow {
  id: string;
  codigo: string;
  status: CaixaStatus;
  abertoPor: string | null;
  fechadoPor: string | null;
  saldoInicial: number;
  totalSistema: number;
  totalConferido: number;
  diferenca: number;
  comandasPagas: number;
  comandasDesistidas: number;
  observacoesAbertura: string | null;
  observacoesFechamento: string | null;
  abertoEm: string;
  fechadoEm: string | null;
}

@Injectable()
export class LojasCaixaService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly schema: LojasSchemaService,
    private readonly events: LojasEventsService,
  ) {}

  async getCaixaAtual() {
    await this.schema.ensureEstrutura();
    const caixa = await this.findCaixaAberto();

    if (!caixa) {
      return {
        caixa: null,
        metodos: [],
        pendencias: await this.getComandasPendentes(),
        historico: await this.getHistoricoCaixas(),
      };
    }

    return {
      caixa,
      metodos: await this.getMetodosCaixa(caixa.id),
      pendencias: await this.getComandasPendentes(),
      historico: await this.getHistoricoCaixas(),
    };
  }

  async abrirCaixa(body: AbrirCaixaDto) {
    await this.schema.ensureEstrutura();
    const existente = await this.findCaixaAberto();

    if (existente) {
      throw new BadRequestException('Já existe um caixa aberto.');
    }

    const codigo = await this.nextCodigoCaixa();
    const id = randomUUID();

    await this.dataSource.query(
      `
        INSERT INTO comercio_caixas (
          id, codigo, status, aberto_por, saldo_inicial, observacoes_abertura,
          aberto_em, created_at, updated_at
        )
        VALUES ($1, $2, 'aberto', $3, $4, $5, NOW(), NOW(), NOW())
      `,
      [
        id,
        codigo,
        body.abertoPor || 'Financeiro',
        asMoney(body.saldoInicial),
        body.observacoes || null,
      ],
    );

    return this.getCaixaAtual();
  }

  async fecharCaixa(body: FecharCaixaDto) {
    await this.schema.ensureEstrutura();
    const caixa = await this.findCaixaAberto();

    if (!caixa) {
      throw new BadRequestException('Não existe caixa aberto para fechamento.');
    }

    const metodosInformados = this.normalizeMetodosInformados(body);
    const fechadoPor = body.fechadoPor || 'Financeiro';

    await this.dataSource.transaction(async (manager) => {
      const metodosSistema = await this.getMetodosCaixa(caixa.id, manager);
      const metodos = this.mergeMetodos(metodosSistema, metodosInformados);
      const totalSistema = asMoney(metodos.reduce((sum, metodo) => sum + metodo.valorSistema, 0));
      const totalConferido = asMoney(metodos.reduce((sum, metodo) => sum + metodo.valorInformado, 0));
      const diferenca = asMoney(totalConferido - totalSistema);

      await manager.query(`DELETE FROM comercio_caixa_metodos WHERE caixa_id = $1::uuid`, [caixa.id]);

      for (const metodo of metodos) {
        await manager.query(
          `
            INSERT INTO comercio_caixa_metodos (
              id, caixa_id, metodo, valor_sistema, valor_informado,
              diferenca, quantidade_pagamentos, created_at
            )
            VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, NOW())
          `,
          [
            randomUUID(),
            caixa.id,
            metodo.metodo,
            metodo.valorSistema,
            metodo.valorInformado,
            metodo.diferenca,
            metodo.quantidadePagamentos,
          ],
        );
      }

      const pendentes = await this.getComandasPendentes(manager);

      await manager.query(
        `
          UPDATE comercio_caixas
          SET status = 'fechado',
              fechado_por = $2,
              total_sistema = $3,
              total_conferido = $4,
              diferenca = $5,
              comandas_pagas = (
                SELECT COUNT(DISTINCT comanda_id)::int
                FROM comercio_pagamentos
                WHERE caixa_id = $1::uuid
              ),
              comandas_desistidas = $6,
              observacoes_fechamento = $7,
              fechado_em = NOW(),
              updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [caixa.id, fechadoPor, totalSistema, totalConferido, diferenca, pendentes.length, body.observacoes || null],
      );

      for (const comanda of pendentes) {
        await manager.query(
          `
            UPDATE comercio_comandas
            SET status = 'desistencia',
                motivo_status = $2,
                finalizada_em = NOW(),
                updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [
            comanda.id,
            `Desistência registrada automaticamente no fechamento do caixa ${caixa.codigo}.`,
          ],
        );

        await manager.query(
          `
            INSERT INTO comercio_eventos_comanda (
              id, comanda_id, tipo, descricao, usuario, metadata, created_at
            )
            VALUES ($1, $2::uuid, 'desistencia_fechamento_caixa', $3, $4, $5::jsonb, NOW())
          `,
          [
            randomUUID(),
            comanda.id,
            `Comanda não paga encerrada como desistência no fechamento do caixa ${caixa.codigo}.`,
            fechadoPor,
            JSON.stringify({ caixaId: caixa.id, caixaCodigo: caixa.codigo }),
          ],
        );
      }
    });

    this.events.emitLojas('caixa_fechado', { caixaId: caixa.id, codigo: caixa.codigo });
    return this.getCaixaAtual();
  }

  async getCaixaAbertoId() {
    await this.schema.ensureEstrutura();
    return (await this.findCaixaAberto())?.id || null;
  }

  private normalizeMetodosInformados(body: FecharCaixaDto) {
    const metodos = Array.isArray(body.metodos) ? body.metodos : [];
    const totals = new Map<string, number>();

    for (const item of metodos) {
      const metodo = this.normalizeMetodo(item.metodo);
      totals.set(metodo, asMoney((totals.get(metodo) || 0) + asMoney(item.valorInformado)));
    }

    return Array.from(totals.entries()).map(([metodo, valorInformado]) => ({ metodo, valorInformado }));
  }

  private mergeMetodos(
    sistema: Awaited<ReturnType<LojasCaixaService['getMetodosCaixa']>>,
    informados: Array<{ metodo: string; valorInformado: number }>,
  ) {
    const byMetodo = new Map<string, {
      metodo: string;
      valorSistema: number;
      valorInformado: number;
      quantidadePagamentos: number;
    }>();

    for (const metodo of sistema) {
      byMetodo.set(metodo.metodo, {
        metodo: metodo.metodo,
        valorSistema: asMoney(metodo.valorSistema),
        valorInformado: asMoney(metodo.valorSistema),
        quantidadePagamentos: Number(metodo.quantidadePagamentos || 0),
      });
    }

    for (const informado of informados) {
      const current = byMetodo.get(informado.metodo) || {
        metodo: informado.metodo,
        valorSistema: 0,
        valorInformado: 0,
        quantidadePagamentos: 0,
      };
      current.valorInformado = asMoney(informado.valorInformado);
      byMetodo.set(informado.metodo, current);
    }

    return Array.from(byMetodo.values())
      .map((metodo) => ({
        ...metodo,
        diferenca: asMoney(metodo.valorInformado - metodo.valorSistema),
      }))
      .sort((a, b) => a.metodo.localeCompare(b.metodo, 'pt-BR'));
  }

  private async findCaixaAberto(): Promise<CaixaRow | null> {
    const [caixa] = await this.dataSource.query(
      `
        SELECT
          id,
          codigo,
          status,
          aberto_por AS "abertoPor",
          fechado_por AS "fechadoPor",
          saldo_inicial::float AS "saldoInicial",
          total_sistema::float AS "totalSistema",
          total_conferido::float AS "totalConferido",
          diferenca::float AS diferenca,
          comandas_pagas AS "comandasPagas",
          comandas_desistidas AS "comandasDesistidas",
          observacoes_abertura AS "observacoesAbertura",
          observacoes_fechamento AS "observacoesFechamento",
          to_char(aberto_em, 'YYYY-MM-DD HH24:MI') AS "abertoEm",
          to_char(fechado_em, 'YYYY-MM-DD HH24:MI') AS "fechadoEm"
        FROM comercio_caixas
        WHERE status = 'aberto'
        ORDER BY aberto_em DESC
        LIMIT 1
      `,
    ) as CaixaRow[];

    return caixa || null;
  }

  private async getHistoricoCaixas() {
    return this.dataSource.query(
      `
        SELECT
          id,
          codigo,
          status,
          aberto_por AS "abertoPor",
          fechado_por AS "fechadoPor",
          saldo_inicial::float AS "saldoInicial",
          total_sistema::float AS "totalSistema",
          total_conferido::float AS "totalConferido",
          diferenca::float AS diferenca,
          comandas_pagas AS "comandasPagas",
          comandas_desistidas AS "comandasDesistidas",
          observacoes_abertura AS "observacoesAbertura",
          observacoes_fechamento AS "observacoesFechamento",
          to_char(aberto_em, 'YYYY-MM-DD HH24:MI') AS "abertoEm",
          to_char(fechado_em, 'YYYY-MM-DD HH24:MI') AS "fechadoEm"
        FROM comercio_caixas
        ORDER BY aberto_em DESC
        LIMIT 12
      `,
    ) as Promise<CaixaRow[]>;
  }

  private async getMetodosCaixa(caixaId: string, runner: { query: DataSource['query'] } = this.dataSource) {
    const rows = await runner.query(
      `
        SELECT
          metodo,
          SUM(valor)::float AS "valorSistema",
          COUNT(*)::int AS "quantidadePagamentos"
        FROM comercio_pagamentos
        WHERE caixa_id = $1::uuid
        GROUP BY metodo
        ORDER BY metodo
      `,
      [caixaId],
    ) as Array<{ metodo: string; valorSistema: number; quantidadePagamentos: number }>;

    return rows.map((row) => ({
      metodo: this.normalizeMetodo(row.metodo),
      valorSistema: asMoney(row.valorSistema),
      valorInformado: asMoney(row.valorSistema),
      diferenca: 0,
      quantidadePagamentos: Number(row.quantidadePagamentos || 0),
    }));
  }

  private async getComandasPendentes(runner: { query: DataSource['query'] } = this.dataSource) {
    return runner.query(
      `
        WITH itens AS (
          SELECT comanda_id, SUM(total_item)::numeric(12,2) AS total
          FROM comercio_comanda_itens
          GROUP BY comanda_id
        ),
        pagamentos AS (
          SELECT comanda_id, SUM(valor)::numeric(12,2) AS pago
          FROM comercio_pagamentos
          GROUP BY comanda_id
        )
        SELECT
          c.id,
          c.codigo,
          cli.nome AS cliente,
          c.status,
          COALESCE(i.total, 0)::float AS total,
          COALESCE(p.pago, 0)::float AS pago,
          GREATEST(COALESCE(i.total, 0) - COALESCE(p.pago, 0), 0)::float AS saldo,
          to_char(c.created_at, 'YYYY-MM-DD HH24:MI') AS "criadaEm"
        FROM comercio_comandas c
        JOIN comercio_clientes cli ON cli.id = c.cliente_id
        LEFT JOIN itens i ON i.comanda_id = c.id
        LEFT JOIN pagamentos p ON p.comanda_id = c.id
        WHERE c.status IN ('aberta', 'aguardando_pagamento')
          AND GREATEST(COALESCE(i.total, 0) - COALESCE(p.pago, 0), 0) > 0.01
        ORDER BY c.created_at ASC
        LIMIT 100
      `,
    ) as Promise<Array<{
      id: string;
      codigo: string;
      cliente: string;
      status: string;
      total: number;
      pago: number;
      saldo: number;
      criadaEm: string;
    }>>;
  }

  private async nextCodigoCaixa() {
    const [row] = await this.dataSource.query(
      `
        SELECT COUNT(*)::int + 1 AS numero
        FROM comercio_caixas
        WHERE aberto_em::date = CURRENT_DATE
      `,
    ) as Array<{ numero: number }>;

    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `CX-${y}${m}${d}-${String(Number(row?.numero || 1)).padStart(2, '0')}`;
  }

  private normalizeMetodo(value: string) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'pix') return 'Pix';
    if (raw.includes('débito') || raw.includes('debito')) return 'Cartão débito';
    if (raw.includes('crédito') || raw.includes('credito')) return 'Cartão crédito';
    if (raw === 'dinheiro') return 'Dinheiro';
    return String(value || '').trim() || 'Outro';
  }
}
