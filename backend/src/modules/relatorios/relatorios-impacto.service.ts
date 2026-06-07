import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthUser } from '../../auth/auth.types';
import {
  type PeriodoExecutivo,
  type RelatorioExecutivoEscopo,
  type RelatorioExecutivoKpi,
  getExecutivePeriod,
} from './relatorios-core-types';
import {
  type AlbergueSnapshot,
  type CrecheSnapshot,
  type FinanceiroSnapshot,
  type RelatorioExecutivoAlerta,
  type RelatorioExecutivoResponse,
  type RelatorioExecutivoServico,
  clampScore,
  getAllowedExecutiveScopes,
} from './relatorios-impacto-types';

@Injectable()
export class RelatoriosImpactoService {
  constructor(private readonly dataSource: DataSource) {}

  async getRelatorioExecutivo(
    actor: AuthUser | undefined,
    escopo?: string,
    periodo?: string,
  ): Promise<RelatorioExecutivoResponse> {
    const scope = this.resolveExecutiveScope(actor, escopo);
    const period = getExecutivePeriod(periodo);
    const needsAlbergue = scope === 'institucional' || scope === 'albergue';
    const needsCreche = scope === 'institucional' || scope === 'creche';
    const needsFinanceiro = scope === 'institucional' || scope === 'financeiro';

    const [albergue, creche, financeiro] = await Promise.all([
      needsAlbergue ? this.getAlbergueSnapshot(period) : Promise.resolve(null),
      needsCreche ? this.getCrecheSnapshot(period) : Promise.resolve(null),
      needsFinanceiro ? this.getFinanceiroSnapshot(period) : Promise.resolve(null),
    ]);

    const services = [
      albergue ? this.buildAlbergueService(albergue) : null,
      creche ? this.buildCrecheService(creche) : null,
      financeiro ? this.buildFinanceiroService(financeiro) : null,
    ].filter((item): item is RelatorioExecutivoServico => Boolean(item));

    const alerts = [
      ...(albergue ? this.buildAlbergueAlerts(albergue) : []),
      ...(creche ? this.buildCrecheAlerts(creche) : []),
      ...(financeiro ? this.buildFinanceiroAlerts(financeiro) : []),
    ];

    const kpis = this.buildExecutiveKpis(scope, albergue, creche, financeiro);
    const score = services.length
      ? Math.round(services.reduce((sum, service) => sum + service.score, 0) / services.length)
      : 0;

    return {
      scope,
      generatedAt: new Date().toISOString(),
      period,
      headline: {
        title: this.getExecutiveTitle(scope),
        summary: this.getExecutiveSummary(scope),
        status: alerts.some((alert) => alert.tone === 'danger') ? 'Exige decisão' : alerts.length ? 'Atenção operacional' : 'Em ordem',
        score,
      },
      kpis,
      services,
      alerts,
      reportBlocks: this.buildReportBlocks(scope),
    };
  }

  private resolveExecutiveScope(actor: AuthUser | undefined, escopo?: string): RelatorioExecutivoEscopo {
    const allowed = getAllowedExecutiveScopes(actor);
    const requested = this.normalizeExecutiveScope(escopo) || allowed[0];

    if (!requested || !allowed.includes(requested)) {
      throw new ForbiddenException('Este perfil não acessa este relatório executivo.');
    }

    return requested;
  }

  private normalizeExecutiveScope(value?: string): RelatorioExecutivoEscopo | null {
    const scope = String(value || '').trim();
    const valid: RelatorioExecutivoEscopo[] = ['institucional', 'albergue', 'creche', 'financeiro'];
    return valid.includes(scope as RelatorioExecutivoEscopo) ? (scope as RelatorioExecutivoEscopo) : null;
  }

  private async getAlbergueSnapshot(period: PeriodoExecutivo): Promise<AlbergueSnapshot> {
    const [row] = await this.dataSource.query(
      `
        WITH estadias_ativas AS (
          SELECT e.id, e.pessoa_id, e.data_limite
          FROM estadias e
          WHERE e.status = 'ativa'
        ),
        estadias_periodo AS (
          SELECT DISTINCT e.pessoa_id
          FROM estadias e
          WHERE e.data_checkin::date < $2::date
            AND COALESCE(e.data_checkout::date, $2::date) >= $1::date
        )
        SELECT
          (SELECT COUNT(*)::int FROM camas) AS "totalVagas",
          (SELECT COUNT(*)::int FROM estadias_ativas) AS ocupadas,
          (SELECT COUNT(*)::int FROM estadias WHERE data_checkin >= $1::date AND data_checkin < $2::date) AS "checkinsPeriodo",
          (SELECT COUNT(*)::int FROM estadias WHERE data_checkout >= $1::date AND data_checkout < $2::date) AS "checkoutsPeriodo",
          (SELECT COUNT(*)::int FROM estadias_ativas WHERE data_limite::date < CURRENT_DATE) AS vencidas,
          (
            SELECT COUNT(*)::int
            FROM estadias_ativas ea
            JOIN pessoas p ON p.id = ea.pessoa_id
            WHERE p.presente = false
          ) AS "presencasPendentes",
          (SELECT COUNT(*)::int FROM estadias_periodo) AS "pessoasUnicasPeriodo"
      `,
      [period.inicio, period.fim],
    );

    return {
      totalVagas: Number(row?.totalVagas || 0),
      ocupadas: Number(row?.ocupadas || 0),
      checkinsPeriodo: Number(row?.checkinsPeriodo || 0),
      checkoutsPeriodo: Number(row?.checkoutsPeriodo || 0),
      vencidas: Number(row?.vencidas || 0),
      presencasPendentes: Number(row?.presencasPendentes || 0),
      pessoasUnicasPeriodo: Number(row?.pessoasUnicasPeriodo || 0),
    };
  }

  private async getCrecheSnapshot(period: PeriodoExecutivo): Promise<CrecheSnapshot> {
    const [row] = await this.dataSource.query(
      `
        WITH frequencias AS (
          SELECT
            COUNT(*)::int AS total_registros,
            COUNT(*) FILTER (WHERE presente = true)::int AS presentes
          FROM creche_frequencias
          WHERE data >= $1::date AND data < $2::date
        ),
        riscos AS (
          SELECT COUNT(*)::int AS total
          FROM (
            SELECT c.id
            FROM creche_criancas c
            JOIN creche_frequencias f ON f.crianca_id = c.id
            WHERE c.status = 'ativa'
              AND f.data >= $1::date
              AND f.data < $2::date
              AND f.presente = false
            GROUP BY c.id
            HAVING COUNT(*) >= 3
          ) base
        )
        SELECT
          (SELECT COUNT(*)::int FROM creche_criancas WHERE status = 'ativa') AS "totalCriancas",
          (SELECT COUNT(*)::int FROM creche_turmas WHERE ativa = true) AS "turmasAtivas",
          COALESCE(ROUND(100.0 * f.presentes / NULLIF(f.total_registros, 0)), 0)::int AS "frequenciaMedia",
          (
            SELECT COUNT(*)::int
            FROM creche_criancas
            WHERE status = 'ativa'
              AND (nis IS NULL OR btrim(nis) = '')
          ) AS "semNis",
          (
            SELECT COUNT(*)::int
            FROM creche_criancas
            WHERE data_ingresso >= $1::date AND data_ingresso < $2::date
          ) AS "ingressosPeriodo",
          COALESCE(r.total, 0)::int AS "riscoEvasao"
        FROM frequencias f
        CROSS JOIN riscos r
      `,
      [period.inicio, period.fim],
    );

    return {
      totalCriancas: Number(row?.totalCriancas || 0),
      turmasAtivas: Number(row?.turmasAtivas || 0),
      frequenciaMedia: Number(row?.frequenciaMedia || 0),
      semNis: Number(row?.semNis || 0),
      ingressosPeriodo: Number(row?.ingressosPeriodo || 0),
      riscoEvasao: Number(row?.riscoEvasao || 0),
    };
  }

  private async getFinanceiroSnapshot(period: PeriodoExecutivo): Promise<FinanceiroSnapshot> {
    const [row] = await this.dataSource.query(
      `
        WITH totais AS (
          SELECT
            c.id,
            c.status,
            c.updated_at,
            COALESCE(SUM(i.total_item), 0)::numeric(12,2) AS total_itens
          FROM comercio_comandas c
          LEFT JOIN comercio_comanda_itens i ON i.comanda_id = c.id
          GROUP BY c.id
        ),
        pagos AS (
          SELECT
            comanda_id,
            SUM(valor)::numeric(12,2) AS total_pago
          FROM comercio_pagamentos
          GROUP BY comanda_id
        ),
        pagamentos_periodo AS (
          SELECT
            COALESCE(SUM(valor), 0)::numeric(12,2) AS realizado,
            COUNT(DISTINCT comanda_id)::int AS comandas_pagas
          FROM comercio_pagamentos
          WHERE created_at >= $1::date AND created_at < $2::date
        ),
        abertas AS (
          SELECT
            COALESCE(SUM(t.total_itens), 0)::numeric(12,2) AS previsto,
            COALESCE(SUM(GREATEST(t.total_itens - COALESCE(p.total_pago, 0), 0)), 0)::numeric(12,2) AS pendente
          FROM totais t
          LEFT JOIN pagos p ON p.comanda_id = t.id
          WHERE t.status IN ('aberta', 'aguardando_pagamento')
        ),
        desistencias AS (
          SELECT
            COUNT(*)::int AS desistencias,
            COALESCE(SUM(total_itens), 0)::numeric(12,2) AS valor_desistido
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
          FROM comercio_retiradas
        )
        SELECT
          COALESCE(a.previsto, 0)::float AS previsto,
          COALESCE(p.realizado, 0)::float AS realizado,
          COALESCE(a.pendente, 0)::float AS pendente,
          COALESCE(d.desistencias, 0)::int AS desistencias,
          COALESCE(d.valor_desistido, 0)::float AS "valorDesistido",
          COALESCE(r.retiradas_pendentes, 0)::int AS "retiradasPendentes",
          COALESCE(r.retiradas_concluidas, 0)::int AS "retiradasConcluidas",
          COALESCE(p.comandas_pagas, 0)::int AS "comandasPagas"
        FROM pagamentos_periodo p
        CROSS JOIN abertas a
        CROSS JOIN desistencias d
        CROSS JOIN retiradas r
      `,
      [period.inicio, period.fim],
    );

    return {
      previsto: Number(row?.previsto || 0),
      realizado: Number(row?.realizado || 0),
      pendente: Number(row?.pendente || 0),
      desistencias: Number(row?.desistencias || 0),
      valorDesistido: Number(row?.valorDesistido || 0),
      retiradasPendentes: Number(row?.retiradasPendentes || 0),
      retiradasConcluidas: Number(row?.retiradasConcluidas || 0),
      comandasPagas: Number(row?.comandasPagas || 0),
    };
  }

  private buildAlbergueService(data: AlbergueSnapshot): RelatorioExecutivoServico {
    const ocupacaoPercentual = data.totalVagas ? Math.round((data.ocupadas / data.totalVagas) * 100) : 0;
    const score = clampScore(100 - data.vencidas * 12 - data.presencasPendentes * 4);

    return {
      id: 'albergue',
      title: 'Albergue Noturno',
      subtitle: 'Acolhimento e permanência',
      score,
      status: data.vencidas ? 'Regularizar permanências' : data.presencasPendentes ? 'Conferir presença' : 'Operação estável',
      summary: `${data.ocupadas} pessoas acolhidas agora, ${ocupacaoPercentual}% de ocupação e ${data.pessoasUnicasPeriodo} pessoas únicas no período.`,
      href: '/albergue/relatorios',
      kpis: [
        { id: 'ocupacao', label: 'Ocupação', value: ocupacaoPercentual, detail: `${data.ocupadas} de ${data.totalVagas} camas`, format: 'percent' },
        { id: 'acessos', label: 'Pessoas únicas', value: data.pessoasUnicasPeriodo, detail: 'Circularam no período' },
        { id: 'checkins', label: 'Entradas', value: data.checkinsPeriodo, detail: 'Check-ins no período', tone: 'success' },
        { id: 'vencidas', label: 'Permanências vencidas', value: data.vencidas, detail: 'Exigem decisão de saída ou prorrogação', tone: data.vencidas ? 'danger' : 'success' },
      ],
    };
  }

  private buildCrecheService(data: CrecheSnapshot): RelatorioExecutivoServico {
    const score = clampScore(100 - data.semNis * 5 - data.riscoEvasao * 8 - Math.max(0, 85 - data.frequenciaMedia));

    return {
      id: 'creche',
      title: 'E.E.I. Casa do Pequenino',
      subtitle: 'Educação infantil',
      score,
      status: data.riscoEvasao ? 'Acompanhar frequência' : data.semNis ? 'Completar aferição' : 'Base consistente',
      summary: `${data.totalCriancas} crianças ativas, ${data.turmasAtivas} turmas e ${data.frequenciaMedia}% de frequência média no período.`,
      href: '/creche/relatorios',
      kpis: [
        { id: 'criancas', label: 'Crianças ativas', value: data.totalCriancas, detail: `${data.turmasAtivas} turmas ativas` },
        { id: 'frequencia', label: 'Frequência média', value: data.frequenciaMedia, detail: 'Registros do período', format: 'percent', tone: data.frequenciaMedia >= 85 ? 'success' : 'warning' },
        { id: 'sem-nis', label: 'Pendências NIS', value: data.semNis, detail: 'Afetam aferição e prestação de contas', tone: data.semNis ? 'warning' : 'success' },
        { id: 'risco', label: 'Risco de evasão', value: data.riscoEvasao, detail: 'Três ou mais faltas no período', tone: data.riscoEvasao ? 'danger' : 'success' },
      ],
    };
  }

  private buildFinanceiroService(data: FinanceiroSnapshot): RelatorioExecutivoServico {
    const score = clampScore(100 - data.retiradasPendentes * 5 - data.desistencias * 4 - Math.min(35, Math.round(data.pendente / 100)));

    return {
      id: 'financeiro',
      title: 'Financeiro comercial',
      subtitle: 'Lojas e comandas',
      score,
      status: data.pendente > 0 ? 'Cobrança pendente' : data.retiradasPendentes ? 'Retirada pendente' : 'Fechamento estável',
      summary: `Realizado no período: R$ ${data.realizado.toFixed(2)}. Pendente em comandas abertas: R$ ${data.pendente.toFixed(2)}.`,
      href: '/lojas/secretaria',
      kpis: [
        { id: 'previsto', label: 'Previsto', value: data.previsto, detail: 'Comandas abertas ou aguardando pagamento', format: 'currency' },
        { id: 'realizado', label: 'Realizado', value: data.realizado, detail: `${data.comandasPagas} comandas pagas no período`, format: 'currency', tone: 'success' },
        { id: 'pendente', label: 'Pendente', value: data.pendente, detail: 'Saldo ainda em aberto', format: 'currency', tone: data.pendente ? 'warning' : 'success' },
        { id: 'retiradas', label: 'Retiradas', value: data.retiradasPendentes, detail: `${data.retiradasConcluidas} concluídas no período`, tone: data.retiradasPendentes ? 'warning' : 'success' },
      ],
    };
  }

  private buildAlbergueAlerts(data: AlbergueSnapshot): RelatorioExecutivoAlerta[] {
    const alerts: RelatorioExecutivoAlerta[] = [];

    if (data.vencidas > 0) {
      alerts.push({
        id: 'albergue-vencidas',
        area: 'albergue',
        title: 'Permanências vencidas',
        description: `${data.vencidas} estadia(s) ultrapassaram o prazo e precisam de decisão registrada.`,
        tone: 'danger',
        href: '/albergue/qualidade-dados',
        actionLabel: 'Ver pendências',
      });
    }

    if (data.presencasPendentes > 0) {
      alerts.push({
        id: 'albergue-presenca',
        area: 'albergue',
        title: 'Presença pendente',
        description: `${data.presencasPendentes} pessoa(s) acolhidas ainda precisam de conferência de presença.`,
        tone: 'warning',
        href: '/albergue/presencas',
        actionLabel: 'Conferir presença',
      });
    }

    return alerts;
  }

  private buildCrecheAlerts(data: CrecheSnapshot): RelatorioExecutivoAlerta[] {
    const alerts: RelatorioExecutivoAlerta[] = [];

    if (data.semNis > 0) {
      alerts.push({
        id: 'creche-nis',
        area: 'creche',
        title: 'Aferição com NIS pendente',
        description: `${data.semNis} criança(s) ativa(s) precisam de NIS para qualificar relatório e prestação de contas.`,
        tone: 'warning',
        href: '/creche/qualidade-dados',
        actionLabel: 'Revisar base',
      });
    }

    if (data.riscoEvasao > 0) {
      alerts.push({
        id: 'creche-evasao',
        area: 'creche',
        title: 'Sinal de evasão escolar',
        description: `${data.riscoEvasao} criança(s) acumulam faltas relevantes no período.`,
        tone: 'danger',
        href: '/creche',
        actionLabel: 'Abrir painel',
      });
    }

    return alerts;
  }

  private buildFinanceiroAlerts(data: FinanceiroSnapshot): RelatorioExecutivoAlerta[] {
    const alerts: RelatorioExecutivoAlerta[] = [];

    if (data.pendente > 0) {
      alerts.push({
        id: 'financeiro-pendente',
        area: 'financeiro',
        title: 'Comandas com valor pendente',
        description: `Há R$ ${data.pendente.toFixed(2)} em saldo aberto para cobrança ou fechamento.`,
        tone: 'warning',
        href: '/lojas/secretaria/fila',
        actionLabel: 'Abrir fila',
      });
    }

    if (data.retiradasPendentes > 0) {
      alerts.push({
        id: 'financeiro-retiradas',
        area: 'financeiro',
        title: 'Retiradas aguardando baixa',
        description: `${data.retiradasPendentes} retirada(s) precisam de confirmação operacional.`,
        tone: 'warning',
        href: '/lojas/secretaria/qualidade-dados',
        actionLabel: 'Ver qualidade',
      });
    }

    return alerts;
  }

  private buildExecutiveKpis(
    scope: RelatorioExecutivoEscopo,
    albergue: AlbergueSnapshot | null,
    creche: CrecheSnapshot | null,
    financeiro: FinanceiroSnapshot | null,
  ): RelatorioExecutivoKpi[] {
    if (scope === 'albergue' && albergue) {
      return this.buildAlbergueService(albergue).kpis;
    }

    if (scope === 'creche' && creche) {
      return this.buildCrecheService(creche).kpis;
    }

    if (scope === 'financeiro' && financeiro) {
      return [
        { id: 'previsto', label: 'Previsto', value: financeiro.previsto, detail: 'Comandas abertas ou aguardando pagamento', format: 'currency' },
        { id: 'realizado', label: 'Realizado', value: financeiro.realizado, detail: `${financeiro.comandasPagas} comandas pagas`, format: 'currency', tone: 'success' },
        { id: 'pendente', label: 'Pendente', value: financeiro.pendente, detail: 'Saldo em aberto', format: 'currency', tone: financeiro.pendente ? 'warning' : 'success' },
        { id: 'desistencias', label: 'Desistências', value: financeiro.valorDesistido, detail: `${financeiro.desistencias} comanda(s) encerradas como desistência`, format: 'currency', tone: financeiro.desistencias ? 'warning' : 'muted' },
        { id: 'retiradas', label: 'Retiradas pendentes', value: financeiro.retiradasPendentes, detail: `${financeiro.retiradasConcluidas} concluídas`, tone: financeiro.retiradasPendentes ? 'warning' : 'success' },
      ];
    }

    return [
      { id: 'pessoas', label: 'Cadastros Albergue', value: albergue?.pessoasUnicasPeriodo || 0, detail: 'Cadastros com passagem no período' },
      { id: 'ocupacao', label: 'Ocupação albergue', value: albergue?.totalVagas ? Math.round((albergue.ocupadas / albergue.totalVagas) * 100) : 0, detail: `${albergue?.ocupadas || 0} pessoas acolhidas agora`, format: 'percent' },
      { id: 'frequencia', label: 'Frequência E.E.I.', value: creche?.frequenciaMedia || 0, detail: 'Média no período', format: 'percent', tone: (creche?.frequenciaMedia || 0) >= 85 ? 'success' : 'warning' },
      { id: 'realizado', label: 'Realizado comercial', value: financeiro?.realizado || 0, detail: 'Lojas no período', format: 'currency', tone: 'success' },
      { id: 'pendencias', label: 'Pendências críticas', value: (albergue?.vencidas || 0) + (creche?.riscoEvasao || 0) + (financeiro?.retiradasPendentes || 0), detail: 'Itens que pedem decisão', tone: 'warning' },
    ];
  }

  private buildReportBlocks(scope: RelatorioExecutivoEscopo) {
    const blocks = [
      {
        id: 'albergue',
        title: 'Relatório social do Albergue',
        description: 'Perfil, acesso, ocupação, permanência, recortes e exportação LGPD.',
        status: 'Operacional',
        href: '/albergue/relatorios',
      },
      {
        id: 'creche',
        title: 'Relatório da E.E.I.',
        description: 'Aferição, frequência, NIS, turmas e prestação de contas da educação infantil.',
        status: 'Operacional',
        href: '/creche/relatorios',
      },
      {
        id: 'financeiro',
        title: 'Relatório financeiro comercial',
        description: 'Previsto, realizado, pendente, desistências, retiradas e fechamento das lojas.',
        status: 'Operacional',
        href: '/lojas/secretaria',
      },
    ];

    if (scope === 'institucional') return blocks;
    return blocks.filter((block) => block.id === scope);
  }

  private getExecutiveTitle(scope: RelatorioExecutivoEscopo) {
    const titles: Record<RelatorioExecutivoEscopo, string> = {
      institucional: 'Relatório executivo institucional',
      albergue: 'Relatório executivo do Albergue',
      creche: 'Relatório executivo da E.E.I.',
      financeiro: 'Relatório comercial e financeiro',
    };

    return titles[scope];
  }

  private getExecutiveSummary(scope: RelatorioExecutivoEscopo) {
    const summaries: Record<RelatorioExecutivoEscopo, string> = {
      institucional: 'Leitura consolidada para gestão: operação social, educação infantil, financeiro comercial e alertas que exigem decisão.',
      albergue: 'Leitura gerencial do acolhimento: ocupação, fluxo do período, presença e permanências que exigem providência.',
      creche: 'Leitura da E.E.I.: crianças ativas, frequência, aferição, documentação e sinais de acompanhamento.',
      financeiro: 'Leitura comercial das lojas: previsto, realizado, pendente, desistências e retiradas.',
    };

    return summaries[scope];
  }
}
