import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  useCrecheDashboard,
  type CrechePeriodoDashboard,
  type CrecheSinalEvasao,
} from '../api';
import '../styles/institutional.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const periodOptions: { label: string; value: CrechePeriodoDashboard }[] = [
  { label: 'Semana', value: 'semana' },
  { label: 'Mês', value: 'mes' },
  { label: 'Trimestre', value: 'trimestre' },
];

function formatPeriodo(inicio?: string, fim?: string) {
  if (!inicio || !fim) return 'Período em atualização';

  const start = new Date(`${inicio}T12:00:00`);
  const end = new Date(`${fim}T12:00:00`);

  return `${start.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })} a ${end.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
}

function formatData(data?: string | null) {
  if (!data) return 'Sem presença no período';
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR');
}

function getRiskClass(risk: CrecheSinalEvasao['nivel']) {
  if (risk === 'Grave') return 'high';
  if (risk === 'Médio') return 'mid';
  return 'low';
}

const CrecheDashboardPage = () => {
  const [periodoGrafico, setPeriodoGrafico] = useState<CrechePeriodoDashboard>('mes');
  const { data: dashboard, loading, error } = useCrecheDashboard('mes');
  const {
    data: graficoDashboard,
    loading: graficoLoading,
    error: graficoError,
  } = useCrecheDashboard(periodoGrafico);
  const turmas = dashboard?.turmas ?? [];
  const frequenciaSemanal = graficoDashboard?.frequenciaSemanal ?? [];
  const sinaisEvasao = dashboard?.sinaisEvasao ?? [];
  const totalCriancas = dashboard?.totalCriancas ?? 0;
  const frequenciaMedia = dashboard?.frequenciaMedia ?? 0;
  const semNis = dashboard?.semNis ?? 0;
  const ingressosPeriodo = dashboard?.ingressosPeriodo ?? 0;
  const riscoEvasao = dashboard?.riscoEvasao ?? 0;
  const periodoTexto = formatPeriodo(graficoDashboard?.periodo.inicio, graficoDashboard?.periodo.fim);

  const frequenciaChartData = useMemo(
    () => ({
      labels: frequenciaSemanal.map((item) => item.dia),
      datasets: [
        {
          label: 'Frequência',
          data: frequenciaSemanal.map((item) => item.frequencia),
          backgroundColor: 'rgba(0, 65, 170, 0.82)',
          borderColor: '#0041aa',
          borderRadius: 12,
          borderSkipped: false,
          borderWidth: 1,
          hoverBackgroundColor: '#2d6fd2',
          maxBarThickness: 54,
        },
      ],
    }),
    [frequenciaSemanal],
  );

  const frequenciaChartOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
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
            label: (context) => `${context.parsed.y}% de frequência`,
            afterLabel: (context) => {
              const point = frequenciaSemanal[context.dataIndex];
              return point ? `${point.presentes} presentes / ${point.ausentes} faltas` : '';
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
    [frequenciaSemanal],
  );

  const atividadeRecente = [
    {
      title: 'Frequência consolidada',
      detail: `${frequenciaMedia}% de frequência média no período da E.E.I.`,
      status: 'Atualizado',
    },
    {
      title: 'Sinais de evasão revisados',
      detail: `${riscoEvasao} crianças com padrão de faltas para acompanhar`,
      status: riscoEvasao > 0 ? 'Atenção' : 'Pronto',
    },
    {
      title: 'Base de aferição',
      detail: `${ingressosPeriodo} ingressos entram na conferência mensal`,
      status: 'Relatórios',
    },
  ];

  return (
    <main className="page-band creche-page">
      <section className="creche-dashboard-head">
        <div>
          <p className="institutional-eyebrow">E.E.I. Casa do Pequenino</p>
          <h1>Painel da Escola de Educação Infantil</h1>
          <p>
            Acompanhe crianças, responsáveis, turmas, frequência, pendências e sinais de evasão
            sem misturar a rotina da E.E.I. com a operação do albergue.
          </p>
        </div>
        <div className="creche-head-actions">
          <Link className="creche-head-link secondary" to="/creche/criancas">
            Crianças
          </Link>
          <Link className="creche-head-link secondary" to="/creche/frequencia">
            Registrar frequência
          </Link>
          <Link className="creche-head-link secondary" to="/creche/professoras">
            Equipe
          </Link>
          <Link className="creche-head-link" to="/creche/relatorios">
            Relatórios da E.E.I.
          </Link>
        </div>
      </section>

      <section className="metrics-grid creche-metrics-grid">
        <article className="metric-card creche-metric-card">
          <span>Crianças ativas</span>
          <strong>{totalCriancas}</strong>
          <small>Distribuídas em {turmas.length || 8} turmas</small>
        </article>
        <article className="metric-card creche-metric-card">
          <span>Pendências NIS</span>
          <strong>{semNis}</strong>
          <small>Base cadastral para aferição</small>
        </article>
        <article className="metric-card creche-metric-card">
          <span>Ingressos no período</span>
          <strong>{ingressosPeriodo}</strong>
          <small>Entram na conferência mensal</small>
        </article>
        <article className="metric-card creche-metric-card warning">
          <span>Sinais de evasão</span>
          <strong>{riscoEvasao}</strong>
          <small>Crianças com faltas para acompanhar</small>
        </article>
      </section>

      <section className="creche-insight-grid">
        <article className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Frequência da E.E.I.</h2>
              <span>Período: {periodoTexto}</span>
            </div>
            <div className="creche-period-tabs" aria-label="Período da frequência">
              {periodOptions.map((option) => (
                <button
                  className={periodoGrafico === option.value ? 'active' : ''}
                  key={option.value}
                  onClick={() => setPeriodoGrafico(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="creche-chart-canvas">
            {frequenciaSemanal.length > 0 ? (
              <Bar data={frequenciaChartData} options={frequenciaChartOptions} />
            ) : (
              <div className="creche-empty-chart">Sem frequência registrada no período</div>
            )}
          </div>
        </article>

        <aside className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Sinais de evasão</h2>
              <span>Somente casos médios e graves</span>
            </div>
          </div>

          <div className="creche-risk-list">
            {sinaisEvasao.map((sinal) => {
              const riskClass = getRiskClass(sinal.nivel);
              return (
                <article className="creche-risk-row" key={sinal.id}>
                  <div className="creche-risk-title">
                    <div>
                      <Link to={`/creche/criancas/${sinal.id}`}>
                        <strong>{sinal.nome}</strong>
                      </Link>
                      <span>{sinal.turma}</span>
                    </div>
                    <em className={riskClass}>{sinal.nivel}</em>
                  </div>
                  <p>
                    {sinal.faltas} faltas no período. Última presença: {formatData(sinal.ultimaPresenca)}.
                  </p>
                  <small>{sinal.responsavel || 'Responsável não informado'} · {sinal.telefone || 'sem telefone'}</small>
                  <div className="creche-risk-track" aria-hidden="true">
                    <i className={riskClass} style={{ width: `${Math.min(sinal.risco, 100)}%` }} />
                  </div>
                </article>
              );
            })}
            {!sinaisEvasao.length && (
              <p className="institutional-note">Nenhum sinal de evasão relevante no período.</p>
            )}
          </div>
        </aside>
      </section>

      <section className="creche-turmas-grid" id="turmas-creche">
        {turmas.map((turma) => {
          const atencao = turma.frequencia < 90 ? 1 : 0;
          return (
            <article className="creche-turma-card" key={turma.id}>
              <div className="creche-turma-top">
                <div>
                  <h2>{turma.nome}</h2>
                  <span>{turma.turno} · {turma.faixaEtaria}</span>
                  <small>{turma.professora || 'Professora não vinculada'}</small>
                </div>
                <em>{turma.criancas} crianças</em>
              </div>

              <div className="creche-turma-stats">
                <div>
                  <strong>{turma.frequencia}%</strong>
                  <span>Frequência</span>
                </div>
                <div>
                  <strong>{atencao}</strong>
                  <span>Atenção</span>
                </div>
              </div>

              <div className="creche-turma-track" aria-hidden="true">
                <i style={{ width: `${Math.min(Math.max(turma.frequencia, 0), 100)}%` }} />
              </div>

              <div className="creche-turma-actions">
                <Link to={`/creche/frequencia?turmaId=${turma.id}`}>Registrar</Link>
                <Link to={`/creche/turmas/${turma.id}`}>Ver turma</Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="creche-bottom-grid">
        <article className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Atividade recente</h2>
              <span>Movimentos operacionais da E.E.I.</span>
            </div>
          </div>
          <div className="creche-activity-list">
            {atividadeRecente.map((item) => (
              <div key={item.title}>
                <p>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </p>
                <em>{item.status}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Relatórios</h2>
              <span>Área técnica da coordenação</span>
            </div>
          </div>
          <div className="creche-report-list">
            <div>
              <p>
                <strong>Instrumento de aferição</strong>
                <span>Nome, CPF, nascimento, NIS e ingresso</span>
              </p>
              <Link to="/creche/relatorios">Abrir</Link>
            </div>
            <div>
              <p>
                <strong>Frequência mensal</strong>
                <span>Consolidado por turma e período</span>
              </p>
              <Link to="/creche/relatorios">Abrir</Link>
            </div>
            <div>
              <p>
                <strong>Pendências cadastrais</strong>
                <span>Lista de revisão para coordenação</span>
              </p>
              <Link to="/creche/relatorios">Abrir</Link>
            </div>
          </div>
        </article>
      </section>

      {loading && <p className="institutional-note">Atualizando dados da E.E.I...</p>}
      {error && <p className="institutional-note">Não foi possível carregar a base da E.E.I.</p>}
      {graficoLoading && <p className="institutional-note">Atualizando gráfico de frequência...</p>}
      {graficoError && <p className="institutional-note">Não foi possível carregar o gráfico de frequência.</p>}
    </main>
  );
};

export default CrecheDashboardPage;
