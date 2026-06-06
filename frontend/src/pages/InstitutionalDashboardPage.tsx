import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCrecheDashboard,
  useLojasDashboard,
  useOcupacaoHistorico,
  useOcupacaoTotal,
  useRelatoriosSociais,
  type LojasPeriodo,
  type OcupacaoPeriodo,
} from '../api';
import EChartCanvas, { type IEDCChartOption } from '../components/EChartCanvas';
import { MetricCard, MetricGrid, PageHeader } from '../components/DesignSystem';
import { TOOLTIP_STYLE, AXIS_LABEL_STYLE, AXIS_LABEL_DARK, GRID_LINE_STYLE, LEGEND_STYLE, IEDC_BLUE_800 } from '../styles/echarts-theme-iedc';
import '../styles/institutional.css';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const periodOptions: { label: string; value: OcupacaoPeriodo }[] = [
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
  { label: '180 dias', value: 180 },
  { label: '1 ano', value: 365 },
];

const lojasPeriodOptions: { label: string; value: LojasPeriodo }[] = [
  { label: 'Dia', value: 'dia' },
  { label: 'Semanal', value: 'semana' },
  { label: 'Mensal', value: 'mes' },
  { label: 'Anual', value: 'ano' },
];

const serviceCards = [
  {
    title: 'Albergue Noturno',
    label: 'Operação 12h',
    description: 'Check-in, checkout, vagas, estadias ativas e conferência de movimento para o plantão.',
    to: '/albergue',
  },
  {
    title: 'E.E.I. Casa do Pequenino',
    label: 'Educação infantil',
    description: 'Crianças, responsáveis, turmas, professoras, frequência e base de aferição mensal.',
    to: '/creche',
  },
  {
    title: 'Lojas',
    label: 'Comercial e financeiro',
    description: 'Bazar, Brechó e Feirão com comanda única, venda prevista, pagamento e desistências.',
    to: '/lojas/secretaria',
  },
];

const activities = [
  {
    title: 'Ocupação do albergue atualizada',
    meta: 'Leitura em tempo real do módulo Albergue',
  },
  {
    title: 'Frequência consolidada da E.E.I.',
    meta: 'Base de abril disponível para conferência',
  },
  {
    title: 'Prévia de aferição disponível',
    meta: 'Nome, CPF, nascimento, NIS e data de ingresso',
  },
];

const InstitutionalDashboardPage = () => {
  const [periodoOcupacao, setPeriodoOcupacao] = useState<OcupacaoPeriodo>(30);
  const [periodoLojas, setPeriodoLojas] = useState<LojasPeriodo>('mes');
  const { data: ocupacao } = useOcupacaoTotal();
  const { data: creche } = useCrecheDashboard();
  const { data: lojasDashboard, loading: lojasLoading } = useLojasDashboard(periodoLojas);
  const { data: relatoriosSociais } = useRelatoriosSociais();
  const { data: ocupacaoHistorico, loading: ocupacaoHistoricoLoading } =
    useOcupacaoHistorico(periodoOcupacao);

  const totalVagas = ocupacao?.total.total ?? 0;
  const ocupadas = ocupacao?.total.ocupadas ?? 0;
  const vagasLivres = Math.max(totalVagas - ocupadas, 0);
  const ocupacaoPercentual = totalVagas ? Math.round((ocupadas / totalVagas) * 100) : 0;

  const totalCriancas = creche?.totalCriancas ?? 0;
  const frequenciaMedia = creche?.frequenciaMedia ?? 0;
  const pendenciasNis = creche?.semNis ?? 0;
  const ingressosPeriodo = creche?.ingressosPeriodo ?? 0;
  const riscoEvasao = creche?.riscoEvasao ?? 0;

  const totalAdultosCadastrados = relatoriosSociais?.totalCadastros ?? ocupadas;
  const pessoasAcompanhadas = totalAdultosCadastrados + totalCriancas;
  const pernoitesMes = ocupadas * 4;
  const turmasCreche = creche?.turmas ?? [];
  const lojas = lojasDashboard?.porLoja ?? [];
  const totalVendasLojas = lojas.reduce((sum, loja) => sum + loja.realizado, 0);
  const ultimoPontoOcupacao = ocupacaoHistorico[ocupacaoHistorico.length - 1];
  const ocupacaoHistoricaPercentual = ultimoPontoOcupacao?.percentual ?? ocupacaoPercentual;
  const ocupacaoHistoricaTotal = ultimoPontoOcupacao?.total ?? totalVagas;
  const ocupacaoHistoricaOcupadas = ultimoPontoOcupacao?.ocupadas ?? ocupadas;

  const ocupacaoLineLabels = useMemo(
    () => ocupacaoHistorico.map((point) => {
      const data = new Date(`${point.data}T12:00:00`);
      return data.toLocaleDateString('pt-BR', {
        day: periodoOcupacao <= 90 ? '2-digit' : undefined,
        month: 'short',
      });
    }),
    [ocupacaoHistorico, periodoOcupacao],
  );

  const ocupacaoLineOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'axis',
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const point = ocupacaoHistorico[p.dataIndex];
          const extra = point ? `<br/>${point.ocupadas} de ${point.total} camas` : '';
          return `${p.name}<br/>${p.value}% de ocupação${extra}`;
        },
      },
      grid: { left: 46, right: 16, top: 12, bottom: 28, containLabel: false },
      xAxis: {
        type: 'category',
        data: ocupacaoLineLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: AXIS_LABEL_STYLE,
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: { ...AXIS_LABEL_STYLE, formatter: '{value}%' },
        splitLine: { lineStyle: GRID_LINE_STYLE },
      },
      series: [
        {
          type: 'line',
          data: ocupacaoHistorico.map((point) => point.percentual),
          lineStyle: { color: IEDC_BLUE_800, width: 3 },
          areaStyle: { color: 'rgba(0, 65, 170, 0.12)' },
          itemStyle: { color: IEDC_BLUE_800, borderColor: '#ffffff', borderWidth: 2 },
          symbolSize: periodoOcupacao === 30 ? 5 : 0,
          smooth: true,
          animationDuration: 850,
        },
      ],
    }),
    [ocupacaoHistorico, ocupacaoLineLabels, periodoOcupacao],
  );

  const frequenciaTurmasOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const turma = turmasCreche[p.dataIndex];
          const extra = turma ? `<br/>${turma.criancas} crianças ativas` : '';
          return `${p.name}<br/>${p.value}% de frequência${extra}`;
        },
      },
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: { ...AXIS_LABEL_STYLE, formatter: '{value}%' },
        splitLine: { lineStyle: GRID_LINE_STYLE },
      },
      yAxis: {
        type: 'category',
        data: turmasCreche.map((turma) => turma.nome),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: AXIS_LABEL_DARK,
        inverse: true,
      },
      series: [
        {
          type: 'bar',
          data: turmasCreche.map((turma) => turma.frequencia),
          itemStyle: { color: 'rgba(0, 65, 170, 0.82)', borderRadius: [0, 10, 10, 0] },
          emphasis: { itemStyle: { color: '#2d6fd2' } },
          barMaxWidth: 28,
          animationDuration: 850,
          animationEasing: 'quarticOut',
        },
      ],
    }),
    [turmasCreche],
  );

  const lojasBarOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          let html = `<strong>${items[0]?.name ?? ''}</strong>`;
          for (const item of items) {
            html += `<br/>${item.seriesName}: ${currency.format(Number(item.value || 0))}`;
          }
          return html;
        },
      },
      legend: { bottom: 0, ...LEGEND_STYLE },
      grid: { left: 64, right: 16, top: 12, bottom: 42, containLabel: false },
      xAxis: {
        type: 'category',
        data: lojas.map((loja) => loja.nome),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: AXIS_LABEL_DARK,
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: GRID_LINE_STYLE },
        axisLabel: { ...AXIS_LABEL_STYLE, formatter: (value: number) => currency.format(value) },
      },
      series: [
        {
          type: 'bar',
          name: 'Previsto',
          data: lojas.map((loja) => loja.previsto),
          itemStyle: { color: 'rgba(64, 119, 207, 0.28)', borderRadius: [10, 10, 0, 0] },
          barMaxWidth: 34,
        },
        {
          type: 'bar',
          name: 'Realizado',
          data: lojas.map((loja) => loja.realizado),
          itemStyle: { color: IEDC_BLUE_800, borderRadius: [10, 10, 0, 0] },
          barMaxWidth: 34,
        },
      ],
      animationDuration: 850,
      animationEasing: 'quarticOut',
    }),
    [lojas],
  );

  const lojasDoughnutOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'item',
        formatter: (params: any) => {
          const value = Number(params.value || 0);
          const percentage = totalVendasLojas ? Math.round((value / totalVendasLojas) * 100) : 0;
          return `${params.name}: ${currency.format(value)} (${percentage}%)`;
        },
      },
      legend: { bottom: 0, ...LEGEND_STYLE },
      series: [
        {
          type: 'pie',
          radius: ['64%', '90%'],
          center: ['50%', '45%'],
          data: lojas.map((loja, i) => ({
            value: loja.realizado,
            name: loja.nome,
            itemStyle: { color: ['#0041aa', '#4077cf', '#f7b044'][i] ?? '#4077cf' },
          })),
          emphasis: { scaleSize: 8 },
          itemStyle: { borderColor: '#ffffff', borderWidth: 4 },
          label: { show: false },
          animationDuration: 850,
          animationEasing: 'quarticOut',
        },
      ],
    }),
    [lojas, totalVendasLojas],
  );

  const reports = [
    {
      title: 'Instrumento de aferição',
      description: `${ingressosPeriodo} ingressos no período, com campos essenciais para conferência.`,
      status: ingressosPeriodo > 0 ? 'Revisar' : 'Pronto',
      tone: ingressosPeriodo > 0 ? 'warning' : 'success',
    },
    {
      title: 'Ocupação do albergue',
      description: `${ocupadas} estadias ativas, ${vagasLivres} vagas livres e pernoites do período.`,
      status: 'Pronto',
      tone: 'success',
    },
    {
      title: 'Frequência da E.E.I.',
      description: `${frequenciaMedia}% de frequência média nas turmas da E.E.I. Casa do Pequenino.`,
      status: 'Pronto',
      tone: 'success',
    },
  ];

  const priorities = [
    {
      title: pendenciasNis > 0 ? 'Completar NIS pendentes' : 'NIS da E.E.I. completos',
      description:
        pendenciasNis > 0
          ? `${pendenciasNis} registros da E.E.I. aguardam revisão cadastral.`
          : 'Todos os cadastros da E.E.I. estão com NIS informado.',
      status: pendenciasNis > 0 ? 'Hoje' : 'Pronto',
      tone: pendenciasNis > 0 ? 'warning' : 'success',
    },
    {
      title: 'Conferir ingressos do período',
      description: `${ingressosPeriodo} registros entram na base comparativa da aferição mensal.`,
      status: ingressosPeriodo > 0 ? 'Atenção' : 'Pronto',
      tone: ingressosPeriodo > 0 ? 'warning' : 'success',
    },
    {
      title: 'Monitorar risco de evasão',
      description: `${riscoEvasao} crianças com padrão de faltas que merece acompanhamento.`,
      status: riscoEvasao > 0 ? 'Atenção' : 'Pronto',
      tone: riscoEvasao > 0 ? 'warning' : 'success',
    },
  ];

  return (
    <main className="executive-dashboard">
      <section className="executive-content">
        <PageHeader
          className="executive-page-head"
          eyebrow="Gestão institucional"
          title="Visão integrada da instituição"
          description="Leia Albergue, E.E.I. e Lojas em uma mesma mesa de decisão, mantendo a autonomia operacional de cada serviço."
        />
        <section className="executive-chart-grid">
          <article className="executive-chart-panel executive-chart-panel-main">
            <div className="executive-chart-header">
              <div>
                <span>Albergue Noturno</span>
                <h2>Ocupação do albergue</h2>
              </div>
              <div className="executive-period-tabs" role="group" aria-label="Período do gráfico de ocupação">
                {periodOptions.map((option) => (
                  <button
                    className={periodoOcupacao === option.value ? 'active' : ''}
                    key={option.value}
                    onClick={() => setPeriodoOcupacao(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="executive-chart-meta">
              <strong>{ocupacaoHistoricaPercentual}% hoje</strong>
              <span>
                {ocupacaoHistoricaTotal
                  ? `${ocupacaoHistoricaOcupadas} ocupadas de ${ocupacaoHistoricaTotal} camas`
                  : 'Aguardando leitura das camas'}
              </span>
            </div>
            <div className="executive-line-chart">
              {ocupacaoHistorico.length > 0 ? (
                <EChartCanvas ariaLabel="Gráfico de ocupação do albergue" option={ocupacaoLineOption} />
              ) : (
                <div className="executive-empty-chart">
                  {ocupacaoHistoricoLoading ? 'Carregando histórico...' : 'Sem histórico no período'}
                </div>
              )}
            </div>
          </article>

          <aside className="executive-chart-panel executive-chart-panel-side">
            <div className="executive-chart-header compact">
              <div>
                <span>E.E.I. Casa do Pequenino</span>
                <h2>Frequência por turma</h2>
              </div>
            </div>
            <strong className="executive-frequency-total">{frequenciaMedia}%</strong>
            <span className="executive-frequency-label">média geral no mês</span>
            <div className="executive-side-bar-chart">
              {turmasCreche.length > 0 ? (
                <EChartCanvas ariaLabel="Frequência por turma da E.E.I." option={frequenciaTurmasOption} />
              ) : (
                <div className="executive-empty-chart executive-empty-chart-compact">
                  Sem frequência da E.E.I. no período
                </div>
              )}
            </div>
          </aside>
        </section>

        <MetricGrid className="executive-kpis">
          <MetricCard label="Total cadastros" value={pessoasAcompanhadas} detail={`${totalAdultosCadastrados} adultos no albergue e ${totalCriancas} crianças na E.E.I.`} />
          <MetricCard label="Pernoites mês" value={pernoitesMes} detail="Estimativa baseada nas estadias ativas do albergue" />
          <MetricCard label="Pendências cadastrais" value={pendenciasNis} detail="NIS ou informação essencial a revisar" tone={pendenciasNis ? 'warning' : 'default'} />
          <MetricCard label="Ingressos do período" value={ingressosPeriodo} detail="Base comparativa para aferição mensal" />
        </MetricGrid>

        <section className="executive-commerce-block">
          <div className="executive-commerce-heading">
            <div>
              <span>Lojas</span>
              <h2>Movimento financeiro</h2>
            </div>
            <div className="executive-commerce-actions">
              <div className="executive-period-tabs" role="group" aria-label="Período dos gráficos das lojas">
                {lojasPeriodOptions.map((option) => (
                  <button
                    className={periodoLojas === option.value ? 'active' : ''}
                    key={option.value}
                    type="button"
                    onClick={() => setPeriodoLojas(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Link to="/lojas/secretaria">Ver financeiro</Link>
            </div>
          </div>

          <div className="executive-commerce-grid">
            <article className="executive-panel executive-commerce-panel">
              <div className="executive-section-title">
                <h2>Previsto e realizado</h2>
              </div>
              <div className="executive-commerce-meta">
                <strong>{currency.format(lojasDashboard?.kpis.vendasPagas ?? 0)}</strong>
                <span>vendas realizadas no período</span>
              </div>
              <div className="executive-commerce-chart">
                {lojas.length > 0 ? (
                  <EChartCanvas ariaLabel="Previsto e realizado das lojas" option={lojasBarOption} />
                ) : (
                  <div className="executive-empty-chart">
                    {lojasLoading ? 'Carregando movimento comercial...' : 'Sem dados comerciais no período'}
                  </div>
                )}
              </div>
            </article>

            <aside className="executive-panel executive-commerce-panel">
              <div className="executive-section-title">
                <h2>Participação por loja</h2>
                <Link to="/lojas/secretaria">Detalhar</Link>
              </div>
              <div className="executive-commerce-donut">
                {totalVendasLojas > 0 ? (
                  <>
                    <EChartCanvas ariaLabel="Participação por loja" option={lojasDoughnutOption} />
                    <div className="executive-commerce-donut-center">
                      <strong>{currency.format(totalVendasLojas)}</strong>
                      <span>realizado</span>
                    </div>
                  </>
                ) : (
                  <div className="executive-empty-chart executive-empty-chart-compact">
                    {lojasLoading ? 'Carregando vendas...' : 'Sem vendas realizadas no período'}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>

        <section className="executive-grid">
          <article className="executive-panel services-panel">
            <div className="executive-section-title">
              <h2>Serviços conectados</h2>
              <Link to="/gestao">Abrir módulos</Link>
            </div>
            <div className="executive-services">
              {serviceCards.map((service) => (
                <Link className="executive-service-card" key={service.title} to={service.to}>
                  <div>
                    <strong>{service.title}</strong>
                    <span>{service.label}</span>
                  </div>
                  <p>{service.description}</p>
                </Link>
              ))}
            </div>
          </article>

          <article className="executive-panel">
            <div className="executive-section-title">
              <h2>Relatórios do mês</h2>
              <Link to="/albergue/relatorios">Ver área técnica</Link>
            </div>
            <div className="executive-report-list">
              {reports.map((report) => (
                <div className="executive-report-row" key={report.title}>
                  <div>
                    <strong>{report.title}</strong>
                    <span>{report.description}</span>
                  </div>
                  <em className={report.tone}>{report.status}</em>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="executive-grid secondary-grid">
          <article className="executive-panel">
            <div className="executive-section-title">
              <h2>Atividades recentes</h2>
            </div>
            <div className="executive-activity-list">
              {activities.map((activity) => (
                <div className="executive-activity-row" key={activity.title}>
                  <div>
                    <strong>{activity.title}</strong>
                    <small>{activity.meta}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="executive-panel">
            <div className="executive-section-title">
              <h2>Prioridades do dia</h2>
            </div>
            <div className="executive-report-list">
              {priorities.map((priority) => (
                <div className="executive-report-row" key={priority.title}>
                  <div>
                    <strong>{priority.title}</strong>
                    <span>{priority.description}</span>
                  </div>
                  <em className={priority.tone}>{priority.status}</em>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
};

export default InstitutionalDashboardPage;
