import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  useCrecheDashboard,
  useLojasDashboard,
  useOcupacaoHistorico,
  useOcupacaoTotal,
  useRelatoriosSociais,
  type LojasPeriodo,
  type OcupacaoPeriodo,
} from '../api';
import '../styles/institutional.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Filler, Legend);

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

  const ocupacaoLineData = useMemo(
    () => ({
      labels: ocupacaoHistorico.map((point) => {
        const data = new Date(`${point.data}T12:00:00`);
        return data.toLocaleDateString('pt-BR', {
          day: periodoOcupacao <= 90 ? '2-digit' : undefined,
          month: 'short',
        });
      }),
      datasets: [
        {
          label: 'Ocupação',
          data: ocupacaoHistorico.map((point) => point.percentual),
          borderColor: '#0041aa',
          backgroundColor: 'rgba(0, 65, 170, 0.12)',
          fill: true,
          tension: 0.34,
          borderWidth: 3,
          pointRadius: periodoOcupacao === 30 ? 2.5 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#0041aa',
          pointBorderWidth: 2,
        },
      ],
    }),
    [ocupacaoHistorico, periodoOcupacao],
  );

  const ocupacaoLineOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#172033',
          padding: 12,
          callbacks: {
            label: (context) => `${context.parsed.y}% de ocupação`,
            afterLabel: (context) => {
              const point = ocupacaoHistorico[context.dataIndex];
              return point ? `${point.ocupadas} de ${point.total} camas` : '';
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#7a879a',
            maxTicksLimit: periodoOcupacao >= 180 ? 8 : 10,
            font: {
              size: 11,
              weight: 700,
            },
          },
        },
        y: {
          min: 0,
          max: 100,
          border: {
            display: false,
          },
          grid: {
            color: 'rgba(104, 119, 142, 0.12)',
          },
          ticks: {
            color: '#7a879a',
            stepSize: 25,
            callback: (value) => `${value}%`,
            font: {
              size: 11,
              weight: 700,
            },
          },
        },
      },
    }),
    [ocupacaoHistorico, periodoOcupacao],
  );

  const frequenciaTurmasChartData = useMemo(
    () => ({
      labels: turmasCreche.map((turma) => turma.nome),
      datasets: [
        {
          label: 'Frequência',
          data: turmasCreche.map((turma) => turma.frequencia),
          backgroundColor: 'rgba(0, 65, 170, 0.82)',
          borderColor: '#0041aa',
          borderRadius: 10,
          borderSkipped: false,
          borderWidth: 1,
          hoverBackgroundColor: '#2d6fd2',
          maxBarThickness: 28,
        },
      ],
    }),
    [turmasCreche],
  );

  const frequenciaTurmasChartOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 850,
        easing: 'easeOutQuart',
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#172033',
          padding: 12,
          callbacks: {
            label: (context) => `${context.parsed.x}% de frequência`,
            afterLabel: (context) => {
              const turma = turmasCreche[context.dataIndex];
              return turma ? `${turma.criancas} crianças ativas` : '';
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          border: {
            display: false,
          },
          grid: {
            color: 'rgba(104, 119, 142, 0.12)',
          },
          ticks: {
            color: '#7a879a',
            stepSize: 25,
            callback: (value) => `${value}%`,
            font: {
              size: 11,
              weight: 700,
            },
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#172033',
            font: {
              size: 11,
              weight: 800,
            },
          },
        },
      },
    }),
    [turmasCreche],
  );

  const lojasBarData = useMemo(
    () => ({
      labels: lojas.map((loja) => loja.nome),
      datasets: [
        {
          label: 'Previsto',
          data: lojas.map((loja) => loja.previsto),
          backgroundColor: 'rgba(64, 119, 207, 0.28)',
          borderRadius: 10,
          borderSkipped: false,
          maxBarThickness: 34,
        },
        {
          label: 'Realizado',
          data: lojas.map((loja) => loja.realizado),
          backgroundColor: '#0041aa',
          borderRadius: 10,
          borderSkipped: false,
          maxBarThickness: 34,
        },
      ],
    }),
    [lojas],
  );

  const lojasBarOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 850,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            color: '#526174',
            font: {
              size: 12,
              weight: 800,
            },
          },
        },
        tooltip: {
          backgroundColor: '#172033',
          padding: 12,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${currency.format(Number(context.parsed.y || 0))}`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#172033',
            font: {
              size: 12,
              weight: 800,
            },
          },
        },
        y: {
          border: {
            display: false,
          },
          grid: {
            color: 'rgba(104, 119, 142, 0.12)',
          },
          ticks: {
            color: '#7a879a',
            callback: (value) => currency.format(Number(value)),
            font: {
              size: 11,
              weight: 700,
            },
          },
        },
      },
    }),
    [],
  );

  const lojasPieData = useMemo(
    () => ({
      labels: lojas.map((loja) => loja.nome),
      datasets: [
        {
          data: lojas.map((loja) => loja.realizado),
          backgroundColor: ['#0041aa', '#4077cf', '#f7b044'],
          borderColor: '#ffffff',
          borderWidth: 4,
          hoverOffset: 8,
        },
      ],
    }),
    [lojas],
  );

  const lojasPieOptions = useMemo<ChartOptions<'doughnut'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      animation: {
        duration: 850,
        easing: 'easeOutQuart',
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            color: '#526174',
            font: {
              size: 12,
              weight: 800,
            },
          },
        },
        tooltip: {
          backgroundColor: '#172033',
          padding: 12,
          callbacks: {
            label: (context) => {
              const value = Number(context.parsed || 0);
              const percentage = totalVendasLojas ? Math.round((value / totalVendasLojas) * 100) : 0;
              return `${context.label}: ${currency.format(value)} (${percentage}%)`;
            },
          },
        },
      },
    }),
    [totalVendasLojas],
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
                <Line data={ocupacaoLineData} options={ocupacaoLineOptions} />
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
                <Bar data={frequenciaTurmasChartData} options={frequenciaTurmasChartOptions} />
              ) : (
                <div className="executive-empty-chart executive-empty-chart-compact">
                  Sem frequência da E.E.I. no período
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="executive-kpis">
          <article>
            <span>Total cadastros</span>
            <strong>{pessoasAcompanhadas}</strong>
            <small>{totalAdultosCadastrados} adultos no albergue e {totalCriancas} crianças na E.E.I.</small>
          </article>
          <article>
            <span>Pernoites mês</span>
            <strong>{pernoitesMes}</strong>
            <small>Estimativa baseada nas estadias ativas do albergue</small>
          </article>
          <article>
            <span>Pendências cadastrais</span>
            <strong>{pendenciasNis}</strong>
            <small>NIS ou informação essencial a revisar</small>
          </article>
          <article>
            <span>Ingressos do período</span>
            <strong>{ingressosPeriodo}</strong>
            <small>Base comparativa para aferição mensal</small>
          </article>
        </section>

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
                  <Bar data={lojasBarData} options={lojasBarOptions} />
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
                    <Doughnut data={lojasPieData} options={lojasPieOptions} />
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
              <Link to="/gestao">Auditoria</Link>
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
