import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MASTER_DATABASE_CONNECTION } from '../../config/database.config';
import {
  AdicionarItemDto,
  AtualizarStatusComandaDto,
  ClienteDto,
  ConfirmarRetiradaDto,
  CriarComandaDto,
  ProdutoDto,
  RegistrarPagamentoDto,
} from './dto/lojas-operacao.dto';
import { LojasCatalogoService } from './lojas-catalogo.service';
import { LojasClientesService } from './lojas-clientes.service';
import { LojasComandasService } from './lojas-comandas.service';
import { LojasEventsService } from './lojas-events.service';
import { LojasExportService } from './lojas-export.service';
import { LojasRetiradasService } from './lojas-retiradas.service';
import { LojasSchemaService } from './lojas-schema.service';
import {
  asMoney,
  LojasDashboard,
  RelatorioFinanceiroDimension,
  RelatorioFinanceiroDrilldown,
  periodoRange,
} from './lojas-shared';

@Injectable()
export class LojasService {
  constructor(
    @InjectDataSource(MASTER_DATABASE_CONNECTION) private readonly dataSource: DataSource,
    private readonly schema: LojasSchemaService,
    private readonly catalogo: LojasCatalogoService,
    private readonly clientes: LojasClientesService,
    private readonly comandas: LojasComandasService,
    private readonly retiradas: LojasRetiradasService,
    private readonly events: LojasEventsService,
    private readonly exportService: LojasExportService,
  ) {}

  async getDashboard(periodo?: string): Promise<LojasDashboard> {
    await this.schema.ensureEstrutura();
    const range = periodoRange(periodo);

    const [kpis] = await this.dataSource.query(
      `
        WITH totais AS (
          SELECT
            c.id,
            c.status,
            c.created_at,
            c.updated_at,
            c.finalizada_em,
            COALESCE(SUM(i.total_item), 0)::numeric(12,2) AS total_itens
          FROM comercial.comandas c
          LEFT JOIN comercial.comanda_itens i ON i.comanda_id = c.id
          GROUP BY c.id
        ),
        pagos AS (
          SELECT
            p.comanda_id,
            SUM(p.valor)::numeric(12,2) AS total_pago
          FROM comercial.pagamentos p
          GROUP BY p.comanda_id
        ),
        pagos_periodo AS (
          SELECT
            SUM(valor)::numeric(12,2) AS vendas_pagas,
            COUNT(DISTINCT comanda_id)::int AS comandas_pagas
          FROM comercial.pagamentos
          WHERE created_at >= $1::date AND created_at < $2::date
        ),
        previstas AS (
          SELECT
            COUNT(*)::int AS comandas_aguardando,
            SUM(GREATEST(t.total_itens - COALESCE(p.total_pago, 0), 0))::numeric(12,2) AS vendas_previstas
          FROM totais t
          LEFT JOIN pagos p ON p.comanda_id = t.id
          WHERE t.status IN ('aberta', 'aguardando_pagamento')
            AND t.total_itens > COALESCE(p.total_pago, 0)
        ),
        desistencia AS (
          SELECT
            COUNT(*)::int AS desistencias,
            SUM(total_itens)::numeric(12,2) AS valor_desistido
          FROM totais
          WHERE status = 'desistencia'
            AND updated_at >= $1::date
            AND updated_at < $2::date
        ),
        retiradas AS (
          SELECT
            COUNT(*) FILTER (WHERE status = 'aguardando_retirada')::int AS retiradas_pendentes,
            COUNT(*) FILTER (
              WHERE status = 'retirado'
                AND retirada_em >= $1::date
                AND retirada_em < $2::date
            )::int AS retiradas_concluidas
          FROM comercial.retiradas
        )
        SELECT
          COALESCE(pp.vendas_pagas, 0)::float AS "vendasPagas",
          COALESCE(pp.comandas_pagas, 0)::int AS "comandasPagas",
          COALESCE(pr.vendas_previstas, 0)::float AS "vendasPrevistas",
          COALESCE(pr.comandas_aguardando, 0)::int AS "comandasAguardando",
          COALESCE(d.desistencias, 0)::int AS desistencias,
          COALESCE(d.valor_desistido, 0)::float AS "valorDesistido",
          COALESCE(r.retiradas_pendentes, 0)::int AS "retiradasPendentes",
          COALESCE(r.retiradas_concluidas, 0)::int AS "retiradasConcluidas",
          COALESCE(ROUND(COALESCE(pp.vendas_pagas, 0) / NULLIF(pp.comandas_pagas, 0), 2), 0)::float AS "ticketMedio",
          COALESCE(ROUND(100.0 * pp.comandas_pagas / NULLIF(pp.comandas_pagas + d.desistencias, 0)), 0)::int AS "taxaConversao"
        FROM pagos_periodo pp
        CROSS JOIN previstas pr
        CROSS JOIN desistencia d
        CROSS JOIN retiradas r
      `,
      [range.inicio, range.fim],
    ) as Array<Record<string, unknown>>;

    const porLoja = await this.dataSource.query(
      `
        SELECT
          l.slug,
          l.nome,
          COALESCE(SUM(i.total_item) FILTER (WHERE c.status = 'paga' AND c.finalizada_em >= $1::date AND c.finalizada_em < $2::date), 0)::float AS realizado,
          COALESCE(SUM(i.total_item) FILTER (WHERE c.status IN ('aberta', 'aguardando_pagamento')), 0)::float AS previsto,
          COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'paga' AND c.finalizada_em >= $1::date AND c.finalizada_em < $2::date), 0)::int AS comandas
        FROM comercial.lojas l
        LEFT JOIN comercial.comanda_itens i ON i.loja_id = l.id
        LEFT JOIN comercial.comandas c ON c.id = i.comanda_id
        GROUP BY l.id, l.slug, l.nome
        ORDER BY l.nome
      `,
      [range.inicio, range.fim],
    );

    const porPagamento = await this.dataSource.query(
      `
        SELECT
          metodo,
          SUM(valor)::float AS total,
          COUNT(*)::int AS quantidade
        FROM comercial.pagamentos
        WHERE created_at >= $1::date AND created_at < $2::date
        GROUP BY metodo
        ORDER BY total DESC
      `,
      [range.inicio, range.fim],
    );

    const serieBucket = range.escopo === 'ano' ? 'month' : 'day';
    const serieStep = range.escopo === 'ano' ? '1 month' : '1 day';
    const serieEndOffset = range.escopo === 'ano' ? '1 month' : '1 day';

    const serie = await this.dataSource.query(
      `
        WITH dias AS (
          SELECT generate_series($1::date, ($2::date - INTERVAL '${serieEndOffset}')::date, INTERVAL '${serieStep}')::date AS dia
        ),
        pagas AS (
          SELECT
            date_trunc('${serieBucket}', created_at)::date AS dia,
            SUM(valor)::numeric(12,2) AS total
          FROM comercial.pagamentos
          WHERE created_at >= $1::date AND created_at < $2::date
          GROUP BY date_trunc('${serieBucket}', created_at)::date
        ),
        previstas AS (
          SELECT
            date_trunc('${serieBucket}', c.created_at)::date AS dia,
            SUM(i.total_item)::numeric(12,2) AS total
          FROM comercial.comandas c
          JOIN comercial.comanda_itens i ON i.comanda_id = c.id
          WHERE c.created_at >= $1::date AND c.created_at < $2::date
          GROUP BY date_trunc('${serieBucket}', c.created_at)::date
        ),
        desistencias AS (
          SELECT
            date_trunc('${serieBucket}', c.updated_at)::date AS dia,
            SUM(i.total_item)::numeric(12,2) AS total
          FROM comercial.comandas c
          JOIN comercial.comanda_itens i ON i.comanda_id = c.id
          WHERE c.status = 'desistencia'
            AND c.updated_at >= $1::date
            AND c.updated_at < $2::date
          GROUP BY date_trunc('${serieBucket}', c.updated_at)::date
        )
        SELECT
          to_char(d.dia, 'YYYY-MM-DD') AS data,
          COALESCE(p.total, 0)::float AS realizado,
          COALESCE(pr.total, 0)::float AS previsto,
          COALESCE(de.total, 0)::float AS desistencias
        FROM dias d
        LEFT JOIN pagas p ON p.dia = d.dia
        LEFT JOIN previstas pr ON pr.dia = d.dia
        LEFT JOIN desistencias de ON de.dia = d.dia
        ORDER BY d.dia
      `,
      [range.inicio, range.fim],
    );

    const comandasAguardando = await this.comandas.getComandas({ status: 'ativas' });
    const recentes = await this.comandas.getComandas({ status: 'recentes', periodo: range.escopo });

    return {
      periodo: range,
      kpis: {
        vendasPagas: asMoney(kpis?.vendasPagas),
        comandasPagas: Number(kpis?.comandasPagas || 0),
        vendasPrevistas: asMoney(kpis?.vendasPrevistas),
        comandasAguardando: Number(kpis?.comandasAguardando || 0),
        desistencias: Number(kpis?.desistencias || 0),
        valorDesistido: asMoney(kpis?.valorDesistido),
        retiradasPendentes: Number(kpis?.retiradasPendentes || 0),
        retiradasConcluidas: Number(kpis?.retiradasConcluidas || 0),
        ticketMedio: asMoney(kpis?.ticketMedio),
        taxaConversao: Number(kpis?.taxaConversao || 0),
      },
      porLoja,
      porPagamento,
      serie,
      comandasAguardando,
      recentes,
    };
  }

  async getRelatorioFinanceiro(periodo?: string) {
    const dashboard = await this.getDashboard(periodo);
    const pendente = dashboard.kpis.vendasPrevistas;
    const statusFechamento = pendente > 0 ? 'com_pendencias' : 'em_dia';

    return {
      periodo: dashboard.periodo,
      ultimaAtualizacao: new Date().toISOString(),
      statusFechamento,
      kpis: dashboard.kpis,
      serie: dashboard.serie,
      porLoja: dashboard.porLoja,
      porPagamento: dashboard.porPagamento,
      pendencias: dashboard.comandasAguardando,
      desistencias: dashboard.recentes.filter((comanda) => comanda.status === 'desistencia'),
      retiradas: {
        pendentes: dashboard.kpis.retiradasPendentes,
        concluidas: dashboard.kpis.retiradasConcluidas,
      },
      ultimasComandas: dashboard.recentes.slice(0, 12),
    };
  }

  async getRelatorioFinanceiroDrilldown(
    periodo: string | undefined,
    dimension: string | undefined,
    key: string | undefined,
  ): Promise<RelatorioFinanceiroDrilldown> {
    const relatorio = await this.getRelatorioFinanceiro(periodo);
    const safeDimension = this.normalizeRelatorioFinanceiroDimension(dimension);
    const safeKey = String(key || '').trim();

    if (safeDimension === 'loja') {
      const loja = relatorio.porLoja.find((item) => String(item.slug) === safeKey) || relatorio.porLoja[0];
      return {
        key: String(loja?.slug || safeKey || 'loja'),
        dimension: 'loja',
        title: String(loja?.nome || 'Loja'),
        resumo: `${Number(loja?.comandas || 0)} comanda(s) pagas no período, com ${formatCurrencyValue(loja?.realizado)} realizados e ${formatCurrencyValue(loja?.previsto)} em aberto.`,
        valores: [
          { label: 'Realizado', value: Number(loja?.realizado || 0), format: 'currency', tone: 'success' },
          { label: 'A receber', value: Number(loja?.previsto || 0), format: 'currency', tone: 'warning' },
          { label: 'Comandas', value: Number(loja?.comandas || 0), format: 'number' },
        ],
      };
    }

    if (safeDimension === 'metodo') {
      const metodo = relatorio.porPagamento.find((item) => String(item.metodo) === safeKey) || relatorio.porPagamento[0];
      return {
        key: String(metodo?.metodo || safeKey || 'metodo'),
        dimension: 'metodo',
        title: String(metodo?.metodo || 'Método de pagamento'),
        resumo: `${Number(metodo?.quantidade || 0)} pagamento(s) registrados no período, somando ${formatCurrencyValue(metodo?.total)}.`,
        valores: [
          { label: 'Total recebido', value: Number(metodo?.total || 0), format: 'currency', tone: 'success' },
          { label: 'Pagamentos', value: Number(metodo?.quantidade || 0), format: 'number' },
        ],
      };
    }

    if (safeDimension === 'periodo') {
      const ponto = relatorio.serie.find((item) => String(item.data) === safeKey) || relatorio.serie[0];
      return {
        key: String(ponto?.data || safeKey || 'periodo'),
        dimension: 'periodo',
        title: formatDateLabel(ponto?.data),
        resumo: `Neste recorte, o financeiro registrou ${formatCurrencyValue(ponto?.realizado)} recebidos, ${formatCurrencyValue(ponto?.previsto)} previstos e ${formatCurrencyValue(ponto?.desistencias)} em desistências.`,
        valores: [
          { label: 'Realizado', value: Number(ponto?.realizado || 0), format: 'currency', tone: 'success' },
          { label: 'Previsto', value: Number(ponto?.previsto || 0), format: 'currency', tone: 'warning' },
          { label: 'Desistências', value: Number(ponto?.desistencias || 0), format: 'currency', tone: 'danger' },
        ],
      };
    }

    return this.buildStatusFinanceiroDrilldown(relatorio, safeKey);
  }

  async exportFechamentoExcel(periodo?: string): Promise<Buffer> {
    const dashboard = await this.getDashboard(periodo);
    return this.exportService.exportFechamentoExcel(dashboard);
  }

  async exportFechamentoPdf(periodo?: string): Promise<Buffer> {
    const dashboard = await this.getDashboard(periodo);
    return this.exportService.exportFechamentoPdf(dashboard);
  }

  getLojas() {
    return this.catalogo.getLojas();
  }

  getProdutos(lojaSlug?: string) {
    return this.catalogo.getProdutos(lojaSlug);
  }

  createProduto(body: ProdutoDto) {
    return this.catalogo.createProduto(body);
  }

  updateProduto(id: string, body: ProdutoDto) {
    return this.catalogo.updateProduto(id, body);
  }

  getClientes(search?: string) {
    return this.clientes.getClientes(search);
  }

  createCliente(body: ClienteDto) {
    return this.clientes.createCliente(body);
  }

  updateCliente(id: string, body: ClienteDto) {
    return this.clientes.updateCliente(id, body);
  }

  getComandas(filters?: { status?: string; lojaSlug?: string; periodo?: string }) {
    return this.comandas.getComandas(filters);
  }

  createComanda(body: CriarComandaDto) {
    return this.comandas.createComanda(body);
  }

  getComandaDetalhe(id: string, lojaSlug?: string) {
    return this.comandas.getComandaDetalhe(id, lojaSlug);
  }

  addItem(comandaId: string, body: AdicionarItemDto) {
    return this.comandas.addItem(comandaId, body);
  }

  removeItem(comandaId: string, itemId: string, lojaSlugPermitido?: string) {
    return this.comandas.removeItem(comandaId, itemId, lojaSlugPermitido);
  }

  registrarPagamento(comandaId: string, body: RegistrarPagamentoDto) {
    return this.comandas.registrarPagamento(comandaId, body);
  }

  updateStatus(comandaId: string, body: AtualizarStatusComandaDto) {
    return this.comandas.updateStatus(comandaId, body);
  }

  getRetiradas(filters?: { lojaSlug?: string; status?: string; periodo?: string }) {
    return this.retiradas.getRetiradas(filters);
  }

  async confirmarRetirada(id: string, body: ConfirmarRetiradaDto) {
    const atualizada = await this.retiradas.confirmarRetirada(id, body);
    const detalhe = await this.comandas.getComandaDetalhe(atualizada.comandaId);
    this.events.emitComandaAtualizada(detalhe);
    return atualizada;
  }

  private normalizeRelatorioFinanceiroDimension(value?: string): RelatorioFinanceiroDimension {
    if (value === 'loja' || value === 'metodo' || value === 'periodo' || value === 'status') {
      return value;
    }

    return 'status';
  }

  private buildStatusFinanceiroDrilldown(
    relatorio: Awaited<ReturnType<LojasService['getRelatorioFinanceiro']>>,
    key: string,
  ): RelatorioFinanceiroDrilldown {
    const statusKey = key || 'realizado';
    const statusMap: Record<string, RelatorioFinanceiroDrilldown> = {
      realizado: {
        key: 'realizado',
        dimension: 'status',
        title: 'Realizado',
        resumo: `${relatorio.kpis.comandasPagas} comanda(s) pagas no período, somando ${formatCurrencyValue(relatorio.kpis.vendasPagas)}.`,
        valores: [
          { label: 'Recebido', value: relatorio.kpis.vendasPagas, format: 'currency', tone: 'success' },
          { label: 'Comandas pagas', value: relatorio.kpis.comandasPagas, format: 'number' },
          { label: 'Ticket médio', value: relatorio.kpis.ticketMedio, format: 'currency' },
        ],
      },
      previsto: {
        key: 'previsto',
        dimension: 'status',
        title: 'A receber',
        resumo: `${relatorio.kpis.comandasAguardando} comanda(s) seguem com saldo em aberto, somando ${formatCurrencyValue(relatorio.kpis.vendasPrevistas)}.`,
        valores: [
          { label: 'A receber', value: relatorio.kpis.vendasPrevistas, format: 'currency', tone: 'warning' },
          { label: 'Comandas abertas', value: relatorio.kpis.comandasAguardando, format: 'number' },
        ],
      },
      pendencias: {
        key: 'pendencias',
        dimension: 'status',
        title: 'Pendências',
        resumo: `${relatorio.kpis.comandasAguardando} comanda(s) aguardam pagamento no fluxo financeiro.`,
        valores: [
          { label: 'Comandas', value: relatorio.kpis.comandasAguardando, format: 'number', tone: 'warning' },
          { label: 'Valor em aberto', value: relatorio.kpis.vendasPrevistas, format: 'currency', tone: 'warning' },
        ],
      },
      desistencias: {
        key: 'desistencias',
        dimension: 'status',
        title: 'Desistências',
        resumo: `${relatorio.kpis.desistencias} desistência(s) registradas no período, com ${formatCurrencyValue(relatorio.kpis.valorDesistido)} em venda perdida.`,
        valores: [
          { label: 'Desistências', value: relatorio.kpis.desistencias, format: 'number', tone: 'danger' },
          { label: 'Venda perdida', value: relatorio.kpis.valorDesistido, format: 'currency', tone: 'danger' },
        ],
      },
      retiradas: {
        key: 'retiradas',
        dimension: 'status',
        title: 'Retiradas',
        resumo: `${relatorio.retiradas.pendentes} retirada(s) pendente(s) e ${relatorio.retiradas.concluidas} concluída(s) no período.`,
        valores: [
          { label: 'Pendentes', value: relatorio.retiradas.pendentes, format: 'number', tone: 'warning' },
          { label: 'Concluídas', value: relatorio.retiradas.concluidas, format: 'number', tone: 'success' },
        ],
      },
    };

    return statusMap[statusKey] || statusMap.realizado;
  }
}

function formatCurrencyValue(value: unknown) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDateLabel(value: unknown) {
  const date = new Date(`${String(value || '')}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Período';

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
