import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCrecheDashboard,
  type CrechePeriodoDashboard,
  type CrecheSinalEvasao,
} from '../api';
import EChartCanvas, { type IEDCChartOption } from '../components/EChartCanvas';
import { MetricCard, MetricGrid, PageHeader } from '../components/DesignSystem';
import { TOOLTIP_STYLE, AXIS_LABEL_STYLE, GRID_LINE_STYLE } from '../styles/echarts-theme-iedc';
import '../styles/institutional.css';

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

  const frequenciaChartOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const point = frequenciaSemanal[p.dataIndex];
          const extra = point ? `<br/>${point.presentes} presentes / ${point.ausentes} faltas` : '';
          return `${p.name}<br/>${p.value}% de frequência${extra}`;
        },
      },
      grid: { left: 46, right: 16, top: 12, bottom: 28, containLabel: false },
      xAxis: {
        type: 'category',
        data: frequenciaSemanal.map((item) => item.dia),
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
          type: 'bar',
          data: frequenciaSemanal.map((item) => item.frequencia),
          itemStyle: {
            color: 'rgba(0, 65, 170, 0.82)',
            borderRadius: [12, 12, 0, 0],
          },
          emphasis: { itemStyle: { color: '#2d6fd2' } },
          barMaxWidth: 54,
          animationDuration: 850,
          animationEasing: 'quarticOut',
        },
      ],
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
      <PageHeader
        eyebrow="E.E.I. Casa do Pequenino"
        title="Painel da Escola de Educação Infantil"
        description="Acompanhe crianças, responsáveis, turmas, frequência, pendências e sinais de evasão sem misturar a rotina da E.E.I. com a operação do albergue."
        actions={(
          <>
          <Link className="creche-head-link secondary" to="/escola/criancas">
            Crianças
          </Link>
          <Link className="creche-head-link secondary" to="/escola/frequencia">
            Registrar frequência
          </Link>
          <Link className="creche-head-link secondary" to="/escola/professoras">
            Equipe
          </Link>
          <Link className="creche-head-link" to="/escola/relatorios">
            Relatórios da E.E.I.
          </Link>
          </>
        )}
      />

      <MetricGrid>
        <MetricCard label="Crianças ativas" value={totalCriancas} detail={`Distribuídas em ${turmas.length || 8} turmas`} />
        <MetricCard label="Pendências NIS" value={semNis} detail="Base cadastral para aferição" />
        <MetricCard label="Ingressos no período" value={ingressosPeriodo} detail="Entram na conferência mensal" />
        <MetricCard label="Sinais de evasão" value={riscoEvasao} detail="Crianças com faltas para acompanhar" tone="warning" />
      </MetricGrid>

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
              <EChartCanvas ariaLabel="Gráfico de frequência da E.E.I." option={frequenciaChartOption} />
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
                      <Link to={`/escola/criancas/${sinal.id}`}>
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
                  <progress className={`creche-risk-track ${riskClass}`} value={Math.min(sinal.risco, 100)} max={100} aria-label={`Risco de evasão de ${sinal.nome}`} />
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

              <progress className="creche-turma-track" value={Math.min(Math.max(turma.frequencia, 0), 100)} max={100} aria-label={`Frequência da turma ${turma.nome}`} />

              <div className="creche-turma-actions">
                <Link to={`/escola/frequencia?turmaId=${turma.id}`}>Registrar</Link>
                <Link to={`/escola/turmas/${turma.id}`}>Ver turma</Link>
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
              <Link to="/escola/relatorios">Abrir</Link>
            </div>
            <div>
              <p>
                <strong>Frequência mensal</strong>
                <span>Consolidado por turma e período</span>
              </p>
              <Link to="/escola/relatorios">Abrir</Link>
            </div>
            <div>
              <p>
                <strong>Pendências cadastrais</strong>
                <span>Lista de revisão para coordenação</span>
              </p>
              <Link to="/escola/relatorios">Abrir</Link>
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
