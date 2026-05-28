import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DiasCruzGateway } from '../websocket/websocket.gateway';

type PeriodoComercial = 'dia' | 'semana' | 'mes' | 'ano';
type StatusComanda = 'aberta' | 'aguardando_pagamento' | 'paga' | 'desistencia' | 'cancelada' | 'expirada';

const LOJAS_OFICIAIS = [
  { slug: 'bazar', nome: 'Bazar' },
  { slug: 'brecho', nome: 'Brechó' },
  { slug: 'feirao', nome: 'Feirão' },
];

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizePeriodo(periodo?: string): PeriodoComercial {
  if (periodo === 'semana' || periodo === 'semanal') {
    return 'semana';
  }

  if (periodo === 'mes' || periodo === 'mensal') {
    return 'mes';
  }

  if (periodo === 'ano' || periodo === 'anual') {
    return 'ano';
  }

  return 'dia';
}

function periodoRange(periodo?: string) {
  const escopo = normalizePeriodo(periodo);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const inicio = new Date(hoje);
  const fim = new Date(hoje);

  if (escopo === 'semana') {
    inicio.setDate(hoje.getDate() - 6);
    fim.setDate(hoje.getDate() + 1);
  } else if (escopo === 'mes') {
    inicio.setDate(1);
    fim.setMonth(hoje.getMonth() + 1, 1);
  } else if (escopo === 'ano') {
    inicio.setMonth(0, 1);
    fim.setFullYear(hoje.getFullYear() + 1, 0, 1);
  } else {
    fim.setDate(hoje.getDate() + 1);
  }

  return {
    escopo,
    inicio: formatDate(inicio),
    fim: formatDate(fim),
  };
}

function asMoney(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : 0;
}

function normalizeCpf(value?: string) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeStatus(value?: string): StatusComanda {
  const status = String(value || '').trim();
  const valid: StatusComanda[] = [
    'aberta',
    'aguardando_pagamento',
    'paga',
    'desistencia',
    'cancelada',
    'expirada',
  ];

  return valid.includes(status as StatusComanda) ? (status as StatusComanda) : 'aberta';
}

@Injectable()
export class LojasService {
  private estruturaPronta = false;
  private estruturaPromise: Promise<void> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly gateway: DiasCruzGateway,
  ) {}

  async getDashboard(periodo?: string) {
    await this.ensureEstrutura();
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
          FROM comercio_comandas c
          LEFT JOIN comercio_comanda_itens i ON i.comanda_id = c.id
          GROUP BY c.id
        ),
        pagos AS (
          SELECT
            p.comanda_id,
            SUM(p.valor)::numeric(12,2) AS total_pago
          FROM comercio_pagamentos p
          GROUP BY p.comanda_id
        ),
        pagos_periodo AS (
          SELECT
            SUM(valor)::numeric(12,2) AS vendas_pagas,
            COUNT(DISTINCT comanda_id)::int AS comandas_pagas
          FROM comercio_pagamentos
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
        )
        SELECT
          COALESCE(pp.vendas_pagas, 0)::float AS "vendasPagas",
          COALESCE(pp.comandas_pagas, 0)::int AS "comandasPagas",
          COALESCE(pr.vendas_previstas, 0)::float AS "vendasPrevistas",
          COALESCE(pr.comandas_aguardando, 0)::int AS "comandasAguardando",
          COALESCE(d.desistencias, 0)::int AS desistencias,
          COALESCE(d.valor_desistido, 0)::float AS "valorDesistido",
          COALESCE(ROUND(COALESCE(pp.vendas_pagas, 0) / NULLIF(pp.comandas_pagas, 0), 2), 0)::float AS "ticketMedio",
          COALESCE(ROUND(100.0 * pp.comandas_pagas / NULLIF(pp.comandas_pagas + d.desistencias, 0)), 0)::int AS "taxaConversao"
        FROM pagos_periodo pp
        CROSS JOIN previstas pr
        CROSS JOIN desistencia d
      `,
      [range.inicio, range.fim],
    );

    const porLoja = await this.dataSource.query(
      `
        SELECT
          l.slug,
          l.nome,
          COALESCE(SUM(i.total_item) FILTER (WHERE c.status = 'paga' AND c.finalizada_em >= $1::date AND c.finalizada_em < $2::date), 0)::float AS realizado,
          COALESCE(SUM(i.total_item) FILTER (WHERE c.status IN ('aberta', 'aguardando_pagamento')), 0)::float AS previsto,
          COALESCE(COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'paga' AND c.finalizada_em >= $1::date AND c.finalizada_em < $2::date), 0)::int AS comandas
        FROM comercio_lojas l
        LEFT JOIN comercio_comanda_itens i ON i.loja_id = l.id
        LEFT JOIN comercio_comandas c ON c.id = i.comanda_id
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
        FROM comercio_pagamentos
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
          FROM comercio_pagamentos
          WHERE created_at >= $1::date AND created_at < $2::date
          GROUP BY date_trunc('${serieBucket}', created_at)::date
        ),
        previstas AS (
          SELECT
            date_trunc('${serieBucket}', c.created_at)::date AS dia,
            SUM(i.total_item)::numeric(12,2) AS total
          FROM comercio_comandas c
          JOIN comercio_comanda_itens i ON i.comanda_id = c.id
          WHERE c.created_at >= $1::date AND c.created_at < $2::date
          GROUP BY date_trunc('${serieBucket}', c.created_at)::date
        )
        SELECT
          to_char(d.dia, 'YYYY-MM-DD') AS data,
          COALESCE(p.total, 0)::float AS realizado,
          COALESCE(pr.total, 0)::float AS previsto
        FROM dias d
        LEFT JOIN pagas p ON p.dia = d.dia
        LEFT JOIN previstas pr ON pr.dia = d.dia
        ORDER BY d.dia
      `,
      [range.inicio, range.fim],
    );

    const comandasAguardando = await this.getComandas({ status: 'ativas' });
    const recentes = await this.getComandas({ status: 'recentes', periodo: range.escopo });

    return {
      periodo: range,
      kpis: {
        vendasPagas: asMoney(kpis?.vendasPagas),
        comandasPagas: Number(kpis?.comandasPagas || 0),
        vendasPrevistas: asMoney(kpis?.vendasPrevistas),
        comandasAguardando: Number(kpis?.comandasAguardando || 0),
        desistencias: Number(kpis?.desistencias || 0),
        valorDesistido: asMoney(kpis?.valorDesistido),
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

  async exportFechamentoExcel(periodo?: string): Promise<Buffer> {
    const dashboard = await this.getDashboard(periodo);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestão Dias da Cruz';
    workbook.created = new Date();

    const resumo = workbook.addWorksheet('Resumo');
    resumo.columns = [
      { header: 'Indicador', key: 'indicador', width: 32 },
      { header: 'Valor', key: 'valor', width: 22 },
    ];
    resumo.addRows([
      { indicador: 'Período', valor: dashboard.periodo.escopo },
      { indicador: 'Início', valor: dashboard.periodo.inicio },
      { indicador: 'Fim', valor: dashboard.periodo.fim },
      { indicador: 'Vendas previstas', valor: dashboard.kpis.vendasPrevistas },
      { indicador: 'Comandas aguardando', valor: dashboard.kpis.comandasAguardando },
      { indicador: 'Vendas realizadas', valor: dashboard.kpis.vendasPagas },
      { indicador: 'Comandas pagas', valor: dashboard.kpis.comandasPagas },
      { indicador: 'Desistências', valor: dashboard.kpis.desistencias },
      { indicador: 'Valor desistido', valor: dashboard.kpis.valorDesistido },
      { indicador: 'Ticket médio', valor: dashboard.kpis.ticketMedio },
      { indicador: 'Taxa de conversão', valor: `${dashboard.kpis.taxaConversao}%` },
    ]);

    const comandas = workbook.addWorksheet('Comandas');
    comandas.columns = [
      { header: 'Código', key: 'codigo', width: 14 },
      { header: 'Cliente', key: 'cliente', width: 28 },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Lojas', key: 'lojas', width: 28 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Pago', key: 'pago', width: 14 },
      { header: 'Saldo', key: 'saldo', width: 14 },
      { header: 'Criada em', key: 'criadaEm', width: 18 },
      { header: 'Finalizada em', key: 'finalizadaEm', width: 18 },
      { header: 'Motivo', key: 'motivoStatus', width: 34 },
    ];
    comandas.addRows(dashboard.recentes.map((comanda: any) => ({
      ...comanda,
      status: this.labelStatus(comanda.status),
    })));

    const lojas = workbook.addWorksheet('Por loja');
    lojas.columns = [
      { header: 'Loja', key: 'nome', width: 22 },
      { header: 'Realizado', key: 'realizado', width: 16 },
      { header: 'Previsto', key: 'previsto', width: 16 },
      { header: 'Comandas pagas', key: 'comandas', width: 18 },
    ];
    lojas.addRows(dashboard.porLoja);

    const pagamentos = workbook.addWorksheet('Pagamentos');
    pagamentos.columns = [
      { header: 'Método', key: 'metodo', width: 18 },
      { header: 'Total', key: 'total', width: 16 },
      { header: 'Quantidade', key: 'quantidade', width: 14 },
    ];
    pagamentos.addRows(dashboard.porPagamento);

    for (const worksheet of workbook.worksheets) {
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0041AA' },
      };
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportFechamentoPdf(periodo?: string): Promise<Buffer> {
    const dashboard = await this.getDashboard(periodo);
    const JsPDF = (jsPDF as any).jsPDF || (jsPDF as any).default || jsPDF;
    const doc = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const periodoLabel = `${dashboard.periodo.inicio} a ${dashboard.periodo.fim}`;

    doc.setFontSize(18);
    doc.text('Fechamento financeiro das Lojas', 40, 42);
    doc.setFontSize(10);
    doc.text(`Período: ${periodoLabel}`, 40, 60);

    const resumo = [
      ['Vendas previstas', this.formatCurrency(dashboard.kpis.vendasPrevistas)],
      ['Vendas realizadas', this.formatCurrency(dashboard.kpis.vendasPagas)],
      ['Comandas aguardando', String(dashboard.kpis.comandasAguardando)],
      ['Desistências', `${dashboard.kpis.desistencias} (${this.formatCurrency(dashboard.kpis.valorDesistido)})`],
      ['Ticket médio', this.formatCurrency(dashboard.kpis.ticketMedio)],
      ['Taxa de conversão', `${dashboard.kpis.taxaConversao}%`],
    ];

    autoTable(doc, {
      head: [['Indicador', 'Valor']],
      body: resumo,
      startY: 84,
      theme: 'grid',
      headStyles: { fillColor: [0, 65, 170] },
      styles: { fontSize: 9, cellPadding: 6 },
      margin: { left: 40, right: 40 },
    });

    const firstTableEndY = (doc as any).lastAutoTable?.finalY || 170;

    autoTable(doc, {
      head: [['Código', 'Cliente', 'Status', 'Lojas', 'Total', 'Pago', 'Saldo', 'Motivo']],
      body: dashboard.recentes.map((comanda: any) => [
        comanda.codigo,
        comanda.cliente,
        this.labelStatus(comanda.status),
        comanda.lojas || '-',
        this.formatCurrency(comanda.total),
        this.formatCurrency(comanda.pago),
        this.formatCurrency(comanda.saldo),
        comanda.motivoStatus || '-',
      ]),
      startY: firstTableEndY + 24,
      theme: 'striped',
      headStyles: { fillColor: [0, 65, 170] },
      styles: { fontSize: 8, cellPadding: 5 },
      margin: { left: 40, right: 40 },
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  async getLojas() {
    await this.ensureEstrutura();

    return this.dataSource.query(
      `
        SELECT id, slug, nome, ativa
        FROM comercio_lojas
        WHERE ativa = true
        ORDER BY CASE slug WHEN 'bazar' THEN 1 WHEN 'brecho' THEN 2 WHEN 'feirao' THEN 3 ELSE 99 END
      `,
    );
  }

  async getProdutos(lojaSlug?: string) {
    await this.ensureEstrutura();

    const params: any[] = [];
    const where = ['p.ativo = true'];

    if (lojaSlug) {
      params.push(lojaSlug);
      where.push(`l.slug = $${params.length}`);
    }

    return this.dataSource.query(
      `
        SELECT
          p.id,
          p.nome,
          p.categoria,
          p.preco::float AS preco,
          p.ativo,
          l.id AS "lojaId",
          l.slug AS "lojaSlug",
          l.nome AS loja
        FROM comercio_produtos p
        JOIN comercio_lojas l ON l.id = p.loja_id
        WHERE ${where.join(' AND ')}
        ORDER BY l.nome, p.categoria, p.nome
      `,
      params,
    );
  }

  async createProduto(body: any) {
    await this.ensureEstrutura();

    if (!body?.nome?.trim()) {
      throw new BadRequestException('Nome do produto é obrigatório.');
    }

    const loja = await this.resolveLoja(body.lojaSlug, body.lojaId);
    const preco = asMoney(body.preco);

    if (preco <= 0) {
      throw new BadRequestException('Preço do produto deve ser maior que zero.');
    }

    const result = await this.dataSource.query(
      `
        INSERT INTO comercio_produtos (
          id, loja_id, nome, categoria, preco, ativo, created_at, updated_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5, true, NOW(), NOW())
        RETURNING id, nome, categoria, preco::float AS preco, ativo
      `,
      [
        randomUUID(),
        loja.id,
        body.nome.trim(),
        body.categoria?.trim() || 'Diversos',
        preco,
      ],
    );
    const produto = Array.isArray(result?.[0]) ? result[0][0] : result?.[0];

    const response = {
      ...produto,
      lojaId: loja.id,
      lojaSlug: loja.slug,
      loja: loja.nome,
    };

    this.emitLojas('produto_criado', { produtoId: response.id, loja: loja.slug, nome: response.nome });

    return response;
  }

  async updateProduto(id: string, body: any) {
    await this.ensureEstrutura();

    if (!body?.nome?.trim()) {
      throw new BadRequestException('Nome do produto é obrigatório.');
    }

    const preco = asMoney(body.preco);

    if (preco <= 0) {
      throw new BadRequestException('Preço do produto deve ser maior que zero.');
    }

    const result = await this.dataSource.query(
      `
        UPDATE comercio_produtos p
        SET nome = $2,
            categoria = $3,
            preco = $4,
            ativo = COALESCE($5::boolean, p.ativo),
            updated_at = NOW()
        FROM comercio_lojas l
        WHERE p.id = $1::uuid
          AND l.id = p.loja_id
          AND ($6::varchar IS NULL OR l.slug = $6::varchar)
        RETURNING
          p.id,
          p.nome,
          p.categoria,
          p.preco::float AS preco,
          p.ativo,
          l.id AS "lojaId",
          l.slug AS "lojaSlug",
          l.nome AS loja
      `,
      [
        id,
        body.nome.trim(),
        body.categoria?.trim() || 'Diversos',
        preco,
        typeof body.ativo === 'boolean' ? body.ativo : null,
        body.lojaSlugPermitido || null,
      ],
    );
    const produto = Array.isArray(result?.[0]) ? result[0][0] : result?.[0];

    if (!produto) {
      throw new NotFoundException('Produto não encontrado ou fora do escopo da loja.');
    }

    this.emitLojas('produto_atualizado', { produtoId: produto.id, loja: produto.lojaSlug, nome: produto.nome });

    return produto;
  }

  async getClientes(search?: string) {
    await this.ensureEstrutura();

    const params: any[] = [];
    const where = ['1 = 1'];

    if (search?.trim()) {
      const termo = search.trim();
      const cpfDigits = normalizeCpf(termo);

      params.push(`%${termo}%`);
      const termoParam = params.length;
      const clauses = [
        `c.nome ILIKE $${termoParam}`,
        `c.telefone ILIKE $${termoParam}`,
        `c.cpf ILIKE $${termoParam}`,
      ];

      if (cpfDigits) {
        params.push(`%${cpfDigits}%`);
        clauses.push(`regexp_replace(c.cpf, '\\D', '', 'g') ILIKE $${params.length}`);
      }

      where.push(`(${clauses.join(' OR ')})`);
    }

    return this.dataSource.query(
      `
        WITH pagamentos AS (
          SELECT
            co.cliente_id,
            SUM(p.valor)::numeric(12,2) AS total_gasto,
            COUNT(DISTINCT p.comanda_id)::int AS compras,
            MAX(p.created_at) AS ultima_compra
          FROM comercio_comandas co
          JOIN comercio_pagamentos p ON p.comanda_id = co.id
          GROUP BY co.cliente_id
        )
        SELECT
          c.id,
          c.nome,
          c.telefone,
          c.cpf,
          c.email,
          c.endereco,
          to_char(c.data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
          c.observacoes,
          COALESCE(p.total_gasto, 0)::float AS "totalGasto",
          COALESCE(p.compras, 0)::int AS compras,
          CASE WHEN p.ultima_compra IS NULL THEN NULL ELSE to_char(p.ultima_compra, 'YYYY-MM-DD') END AS "ultimaCompra"
        FROM comercio_clientes c
        LEFT JOIN pagamentos p ON p.cliente_id = c.id
        WHERE ${where.join(' AND ')}
        ORDER BY c.nome
        LIMIT 40
      `,
      params,
    );
  }

  async createCliente(body: any) {
    await this.ensureEstrutura();

    if (!body?.nome?.trim()) {
      throw new BadRequestException('Nome do cliente é obrigatório.');
    }

    const cpf = await this.prepareCpf(body.cpf);
    const id = randomUUID();

    await this.dataSource.query(
      `
        INSERT INTO comercio_clientes (
          id, nome, telefone, cpf, email, endereco, data_nascimento, observacoes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::date, $8, NOW(), NOW())
      `,
      [
        id,
        body.nome.trim(),
        body.telefone?.trim() || '',
        cpf,
        body.email?.trim() || '',
        body.endereco?.trim() || '',
        body.dataNascimento || '',
        body.observacoes?.trim() || null,
      ],
    );

    const [cliente] = await this.dataSource.query(
      `
        SELECT
          id,
          nome,
          telefone,
          cpf,
          email,
          endereco,
          to_char(data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
          observacoes,
          0::float AS "totalGasto",
          0::int AS compras,
          NULL AS "ultimaCompra"
        FROM comercio_clientes
        WHERE id = $1::uuid
      `,
      [id],
    );

    this.emitLojas('cliente_criado', { clienteId: id, nome: cliente.nome });

    return cliente;
  }

  async updateCliente(id: string, body: any) {
    await this.ensureEstrutura();

    if (!body?.nome?.trim()) {
      throw new BadRequestException('Nome do cliente é obrigatório.');
    }

    const cpf = await this.prepareCpf(body.cpf, id);

    const result = await this.dataSource.query(
      `
        UPDATE comercio_clientes
        SET nome = $2,
            telefone = $3,
            cpf = $4,
            email = $5,
            endereco = $6,
            data_nascimento = NULLIF($7, '')::date,
            observacoes = $8,
            updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING
          id,
          nome,
          telefone,
          cpf,
          email,
          endereco,
          to_char(data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
          observacoes
      `,
      [
        id,
        body.nome.trim(),
        body.telefone?.trim() || '',
        cpf,
        body.email?.trim() || '',
        body.endereco?.trim() || '',
        body.dataNascimento || '',
        body.observacoes?.trim() || null,
      ],
    );

    const cliente = Array.isArray(result?.[0]) ? result[0][0] : result?.[0];

    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    const response = {
      ...cliente,
      totalGasto: 0,
      compras: 0,
      ultimaCompra: null,
    };

    this.emitLojas('cliente_atualizado', { clienteId: id, nome: cliente.nome });
    this.gateway.emitClienteComercialAtualizado(response);

    return response;
  }

  async getComandas(filters?: { status?: string; lojaSlug?: string; periodo?: string }) {
    await this.ensureEstrutura();

    const params: any[] = [];
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
    );
  }

  async createComanda(body: any) {
    await this.ensureEstrutura();

    const clienteId = await this.resolveClienteId(body);
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
    );

    if (existente?.id) {
      return this.getComandaDetalhe(existente.id);
    }

    const [proximo] = await this.dataSource.query(`
      SELECT
        COALESCE(MAX(NULLIF(regexp_replace(codigo, '\\D', '', 'g'), '')::int), 0) + 1 AS numero
      FROM comercio_comandas
    `);

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

    await this.registrarEvento(id, 'comanda_criada', 'Comanda criada para venda prevista.', body.criadaPor || body.usuario);

    const detalhe = await this.getComandaDetalhe(id);
    this.emitLojas('comanda_criada', { comandaId: id, codigo, cliente: detalhe.cliente });
    this.gateway.emitComandaAtualizada(detalhe);

    return detalhe;
  }

  async getComandaDetalhe(id: string, lojaSlug?: string) {
    await this.ensureEstrutura();

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
    );

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

  async addItem(comandaId: string, body: any) {
    await this.ensureEstrutura();

    if (!body?.descricao?.trim() && !body?.produtoId) {
      throw new BadRequestException('Informe o produto ou a descrição do item.');
    }

    const loja = await this.resolveLoja(body.lojaSlug, body.lojaId);
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
        )
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

    await this.registrarEvento(
      comandaId,
      'item_adicionado',
      `${loja.nome} adicionou ${quantidade} item(ns) à comanda.`,
      body.usuario || body.lancadoPor,
      { loja: loja.slug, descricao, total },
    );

    const detalhe = await this.getComandaDetalhe(comandaId);
    this.emitLojas('item_adicionado', { comandaId, loja: loja.slug, total });
    this.gateway.emitComandaAtualizada(detalhe);

    return detalhe;
  }

  async removeItem(comandaId: string, itemId: string, lojaSlugPermitido?: string) {
    await this.ensureEstrutura();
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

    await this.registrarEvento(comandaId, 'item_removido', 'Item removido da comanda.');

    const detalhe = await this.getComandaDetalhe(comandaId);
    this.emitLojas('item_removido', { comandaId, itemId });
    this.gateway.emitComandaAtualizada(detalhe);

    return detalhe;
  }

  async registrarPagamento(comandaId: string, body: any) {
    await this.ensureEstrutura();

    const detalhe = await this.getComandaDetalhe(comandaId);

    if (['paga', 'desistencia', 'cancelada', 'expirada'].includes(detalhe.status)) {
      throw new BadRequestException('Esta comanda não aceita novos pagamentos.');
    }

    const pagamentosPayload = Array.isArray(body?.pagamentos) ? body.pagamentos : [];
    const pagamentos = pagamentosPayload
      .map((pagamento: any) => ({
        metodo: String(pagamento.metodo || '').trim(),
        valor: asMoney(pagamento.valor),
      }))
      .filter((pagamento: any) => pagamento.metodo && pagamento.valor > 0);

    if (!pagamentos.length) {
      throw new BadRequestException('Informe ao menos um pagamento com valor.');
    }

    const totalNovosPagamentos = pagamentos.reduce((sum: number, pagamento: any) => sum + pagamento.valor, 0);

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
    let retiradasLiberadas: any[] = [];

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
        retiradasLiberadas = await this.criarRetiradasPendentes(comandaId, manager, usuarioEvento);
      }
    });

    const detalheFinal = await this.getComandaDetalhe(comandaId);
    this.emitLojas(novoStatus === 'paga' ? 'comanda_paga' : 'pagamento_parcial', { comandaId, total: totalNovosPagamentos });
    retiradasLiberadas.forEach((retirada) => {
      this.gateway.emitRetiradaAtualizada(retirada);
    });
    this.gateway.emitComandaAtualizada(detalheFinal);

    return detalheFinal;
  }

  async updateStatus(comandaId: string, body: any) {
    await this.ensureEstrutura();
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

    await this.registrarEvento(
      comandaId,
      `status_${status}`,
      body?.motivo || `Comanda alterada para ${status}.`,
      body?.usuario,
    );

    const detalhe = await this.getComandaDetalhe(comandaId);
    this.emitLojas(`status_${status}`, { comandaId, status });
    this.gateway.emitComandaAtualizada(detalhe);

    return detalhe;
  }

  async getRetiradas(filters?: { lojaSlug?: string; status?: string; periodo?: string }) {
    await this.ensureEstrutura();

    const params: any[] = [];
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
          FROM comercio_comanda_itens i
          GROUP BY i.comanda_id, i.loja_id
        )
        SELECT
          r.id,
          r.comanda_id AS "comandaId",
          c.codigo,
          c.status AS "comandaStatus",
          cli.id AS "clienteId",
          cli.nome AS cliente,
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
        FROM comercio_retiradas r
        JOIN comercio_comandas c ON c.id = r.comanda_id
        JOIN comercio_clientes cli ON cli.id = c.cliente_id
        JOIN comercio_lojas l ON l.id = r.loja_id
        LEFT JOIN itens i ON i.comanda_id = r.comanda_id AND i.loja_id = r.loja_id
        ${whereSql}
        ORDER BY
          CASE WHEN r.status = 'aguardando_retirada' THEN 0 ELSE 1 END,
          r.updated_at DESC,
          r.notificada_em DESC
        LIMIT 120
      `,
      params,
    );
  }

  async confirmarRetirada(id: string, body: any) {
    await this.ensureEstrutura();

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
          UPDATE comercio_retiradas
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

      await this.registrarEvento(
        retirada.comandaId,
        'retirada_confirmada',
        `${retirada.loja} confirmou a retirada do pedido.`,
        body?.entreguePor || body?.usuario,
        { loja: retirada.lojaSlug, retiradaId: id },
      );
    }

    const atualizada = await this.getRetiradaById(id);
    const detalhe = await this.getComandaDetalhe(atualizada.comandaId);
    this.emitLojas('retirada_confirmada', {
      retiradaId: id,
      comandaId: atualizada.comandaId,
      codigo: atualizada.codigo,
      loja: atualizada.lojaSlug,
    });
    this.gateway.emitRetiradaAtualizada(atualizada);
    this.gateway.emitComandaAtualizada(detalhe);

    return atualizada;
  }

  private async resolveClienteId(body: any) {
    if (body?.clienteId) {
      return body.clienteId;
    }

    if (body?.cliente?.nome) {
      const cliente = await this.createCliente(body.cliente);
      return cliente.id;
    }

    throw new BadRequestException('Cliente é obrigatório para abrir a comanda.');
  }

  private async prepareCpf(cpf?: string, ignoreId?: string) {
    const cpfDigits = normalizeCpf(cpf);

    if (!cpfDigits) {
      return '';
    }

    if (cpfDigits.length !== 11) {
      throw new BadRequestException('CPF deve conter 11 dígitos.');
    }

    const [duplicado] = await this.dataSource.query(
      `
        SELECT id, nome
        FROM comercio_clientes
        WHERE regexp_replace(cpf, '\\D', '', 'g') = $1
          AND ($2::uuid IS NULL OR id <> $2::uuid)
        LIMIT 1
      `,
      [cpfDigits, ignoreId || null],
    );

    if (duplicado) {
      throw new BadRequestException(`Já existe um cliente com este CPF: ${duplicado.nome}.`);
    }

    return cpfDigits;
  }

  private async resolveLoja(lojaSlug?: string, lojaId?: string) {
    const params = [];
    let where = '';

    if (lojaId) {
      params.push(lojaId);
      where = 'id = $1::uuid';
    } else if (lojaSlug) {
      params.push(lojaSlug);
      where = 'slug = $1';
    } else {
      throw new BadRequestException('Loja é obrigatória.');
    }

    const [loja] = await this.dataSource.query(
      `
        SELECT id, slug, nome
        FROM comercio_lojas
        WHERE ${where} AND ativa = true
      `,
      params,
    );

    if (!loja) {
      throw new BadRequestException('Loja não encontrada.');
    }

    return loja;
  }

  private async assertComandaOperavel(comandaId: string) {
    const [comanda] = await this.dataSource.query(
      `
        SELECT id, status
        FROM comercio_comandas
        WHERE id = $1::uuid
      `,
      [comandaId],
    );

    if (!comanda) {
      throw new NotFoundException('Comanda não encontrada.');
    }

    if (['paga', 'desistencia', 'cancelada', 'expirada'].includes(comanda.status)) {
      throw new BadRequestException('Esta comanda já foi finalizada.');
    }
  }

  private emitLojas(tipo: string, payload: any = {}) {
    this.gateway.emitLojasAtualizadas({
      tipo,
      payload,
      emitidoEm: new Date().toISOString(),
    });
  }

  private labelStatus(status: string) {
    const labels: Record<string, string> = {
      aberta: 'Aberta',
      aguardando_pagamento: 'Aguardando pagamento',
      paga: 'Paga',
      desistencia: 'Desistência',
      cancelada: 'Cancelada',
      expirada: 'Expirada',
    };

    return labels[status] || status;
  }

  private formatCurrency(value: unknown) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  private async registrarEvento(comandaId: string, tipo: string, descricao: string, usuario?: string, metadata?: any) {
    await this.dataSource.query(
      `
        INSERT INTO comercio_eventos_comanda (
          id, comanda_id, tipo, descricao, usuario, metadata, created_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, NOW())
      `,
      [randomUUID(), comandaId, tipo, descricao, usuario || null, JSON.stringify(metadata || {})],
    );
  }

  private async getRetiradaById(id: string) {
    const [retirada] = await this.dataSource.query(
      `
        WITH itens AS (
          SELECT
            i.comanda_id,
            i.loja_id,
            SUM(i.total_item)::numeric(12,2) AS total,
            COUNT(*)::int AS itens
          FROM comercio_comanda_itens i
          GROUP BY i.comanda_id, i.loja_id
        )
        SELECT
          r.id,
          r.comanda_id AS "comandaId",
          c.codigo,
          c.status AS "comandaStatus",
          cli.id AS "clienteId",
          cli.nome AS cliente,
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
        FROM comercio_retiradas r
        JOIN comercio_comandas c ON c.id = r.comanda_id
        JOIN comercio_clientes cli ON cli.id = c.cliente_id
        JOIN comercio_lojas l ON l.id = r.loja_id
        LEFT JOIN itens i ON i.comanda_id = r.comanda_id AND i.loja_id = r.loja_id
        WHERE r.id = $1::uuid
      `,
      [id],
    );

    return retirada || null;
  }

  private async criarRetiradasPendentes(comandaId: string, runner: { query: Function } = this.dataSource, usuario?: string) {
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

    const retiradas: any[] = [];

    for (const loja of lojas) {
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
          FROM comercio_retiradas r
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

  private async ensureEstrutura() {
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
      CREATE INDEX IF NOT EXISTS idx_comercio_comandas_status ON comercio_comandas(status);
      CREATE INDEX IF NOT EXISTS idx_comercio_comandas_cliente ON comercio_comandas(cliente_id);
      CREATE INDEX IF NOT EXISTS idx_comercio_itens_comanda ON comercio_comanda_itens(comanda_id);
      CREATE INDEX IF NOT EXISTS idx_comercio_pagamentos_comanda ON comercio_pagamentos(comanda_id);
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

    for (const comanda of comandas) {
      await this.criarRetiradasPendentes(comanda.id, this.dataSource, 'Sistema local');
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
