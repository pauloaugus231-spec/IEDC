import { useState, useEffect, useMemo, type CSSProperties } from 'react';
import { apiFetch, useOcupacaoHistorico, useOcupacaoTotal } from '../api';
import EChartCanvas, { type IEDCChartOption } from '../components/EChartCanvas';
import { PageHeader } from '../components/DesignSystem';
import PessoaCasaModal from '../components/PessoaCasaModal';
import PresenceFloater from '../components/PresenceFloater';
import { TOOLTIP_STYLE, AXIS_LABEL_STYLE, GRID_LINE_STYLE } from '../styles/echarts-theme-iedc';
import { clearTriagemCensoStorage, getTriagemCensoStorageState } from '../utils';

// --- INTERFACES ---
interface OcupacaoData {
  total: { ocupadas: number; total: number; };
  casas: { [key: string]: { ocupadas: number; total: number; } };
}

// Configuração de labels
const casaConfig: Record<string, { label: string }> = {
  MASCULINA: { label: 'Masculina' },
  'MISTA_MULHERES': { label: 'Feminina' },
  LGBT: { label: 'LGBT+' },
  IDOSOS: { label: 'Idosos' },
};

const DashboardPage = () => {
  
  // --- ESTADOS ---
  const [ocupacao, setOcupacao] = useState<OcupacaoData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCasa, setSelectedCasa] = useState('');
  const [selectedCasaLabel, setSelectedCasaLabel] = useState('');
  const [pendentesCount, setPendentesCount] = useState(0);
  
  // Estados para Timeline (Previsão)
  const [checkoutsHoje, setCheckoutsHoje] = useState<number>(0);
  const [totalAtivosPresenca, setTotalAtivosPresenca] = useState(0);

  // Estados legados (Censo/Floater)
  const [isTriagemEncerrada, setIsTriagemEncerrada] = useState(false);
  const [censoData, setCensoData] = useState<any>(null);

  // Carregar estado da triagem do localStorage
  useEffect(() => {
    const storageState = getTriagemCensoStorageState();

    if (storageState.shouldClear) {
      clearTriagemCensoStorage();
      setIsTriagemEncerrada(false);
      setCensoData(null);
      return;
    }

    if (storageState.mode === 'censo') {
      setIsTriagemEncerrada(true);
      const storedCenso = localStorage.getItem('censoData');
      if (storedCenso) {
        try {
          setCensoData(JSON.parse(storedCenso));
        } catch (e) {
          console.error('Erro ao parsear censoData:', e);
        }
      }
      return;
    }

    setIsTriagemEncerrada(false);
    setCensoData(null);
  }, []);

  // --- HOOKS DE DADOS ---
  const { data: initialOcupacao, loading: initialLoading } = useOcupacaoTotal();
  const { data: historyData, loading: historicoLoading } = useOcupacaoHistorico(7);

  useEffect(() => { if (initialOcupacao) setOcupacao(initialOcupacao); }, [initialOcupacao]);

  // Carregar dados de Previsão (Simulação de API)
  useEffect(() => {
    const fetchDadosOperacionais = async () => {
      try {
        // 1. Buscar pendentes de presença (Presença não marcada)
        const ativos = await apiFetch<any[]>('/api/pessoas/ativos').catch(() => []);
        const ativosList = Array.isArray(ativos) ? ativos : [];
        setPendentesCount(ativosList.filter((a: any) => !a.presente).length);
        setTotalAtivosPresenca(ativosList.length);
        
        // 2. Buscar saídas previstas para hoje (estadias que terminam hoje)
        const saidasData = await apiFetch<{ count: number }>('/api/dashboard/saidas-previstas-hoje').catch(() => ({ count: 0 }));
        setCheckoutsHoje(saidasData.count || 0);

      } catch (e) { console.error(e); }
    };
    fetchDadosOperacionais();
  }, []);

  // --- LÓGICA DE UI ---
  const handleCasaClick = (key: string) => {
    const config = casaConfig[key] || { label: key };
    setSelectedCasa(key);
    setSelectedCasaLabel(config.label);
    setModalOpen(true);
  };

  // Melhoria 1: Cores Semânticas
  const getStatusColor = (livres: number) => {
    if (livres === 0) return { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', badge: '#FEE2E2' }; // Vermelho
    if (livres <= 2) return { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', badge: '#FEF3C7' }; // Laranja
    return { bg: 'white', border: '#E5E7EB', text: '#059669', badge: '#D1FAE5' }; // Verde (Padrão)
  };

  const loading = initialLoading && !ocupacao;
  const totalOcupadas = ocupacao?.total.ocupadas ?? 0;
  const totalVagas = ocupacao?.total.total ?? 0;
  const ocupacaoPercent = totalVagas > 0 ? Math.round((totalOcupadas / totalVagas) * 100) : 0;

  const maiorOcupacaoHistorica = Math.max(...historyData.map((item) => item.ocupadas), totalOcupadas, 1);
  const maiorIngressoHistorico = Math.max(...historyData.map((item) => item.ingressos), 0);

  const labels = useMemo(
    () => historyData.map((item) => {
      const date = new Date(`${item.data}T12:00:00`);
      return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
    }),
    [historyData],
  );

  const historicoChartOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const idx = items[0]?.dataIndex ?? 0;
          const point = historyData[idx];
          let html = `<strong>${items[0]?.name ?? ''}</strong>`;
          for (const item of items) {
            const name = item.seriesName ?? '';
            if (name === 'Ocupação') html += `<br/>Ocupação: ${item.value} ocupadas`;
            else if (name === 'Novos ingressos') html += `<br/>Novos ingressos: ${item.value}`;
          }
          if (point) html += `<br/>${point.percentual}% de ocupação · capacidade ${point.total} camas`;
          return html;
        },
      },
      legend: { show: false },
      grid: { left: 40, right: 48, top: 18, bottom: 32, containLabel: false },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: AXIS_LABEL_STYLE,
      },
      yAxis: [
        {
          type: 'value',
          min: 0,
          max: Math.max(5, Math.ceil(maiorOcupacaoHistorica * 1.4)),
          splitLine: { lineStyle: GRID_LINE_STYLE },
          axisLabel: AXIS_LABEL_STYLE,
        },
        {
          type: 'value',
          min: 0,
          max: Math.max(5, maiorIngressoHistorico + 2),
          splitLine: { show: false },
          axisLabel: { ...AXIS_LABEL_STYLE, color: '#0f9d58' },
        },
      ],
      series: [
        {
          type: 'bar',
          name: 'Ocupação',
          data: historyData.map((item) => item.ocupadas),
          yAxisIndex: 0,
          itemStyle: { color: 'rgba(37, 99, 235, 0.86)', borderRadius: [10, 10, 0, 0] },
          emphasis: { itemStyle: { color: '#1d4ed8' } },
          barMaxWidth: 42,
          animationDuration: 1000,
          animationEasing: 'quarticOut',
        },
        {
          type: 'line',
          name: 'Novos ingressos',
          data: historyData.map((item) => item.ingressos),
          yAxisIndex: 1,
          lineStyle: { color: '#0f9d58', width: 3 },
          itemStyle: { color: '#0f9d58', borderColor: '#ffffff', borderWidth: 2 },
          symbolSize: 6,
          smooth: true,
          animationDuration: 1000,
        },
      ],
    }),
    [historyData, labels, maiorOcupacaoHistorica, maiorIngressoHistorico],
  );

  return (
    <main className="page-band albergue-dashboard-page">
      <PageHeader
        eyebrow="Albergue Noturno"
        title="Painel de controle"
        description="Resumo operacional do plantão, ocupação por casa, presença e saídas previstas."
        actions={(
          <div className="ds-context-badge">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        )}
      />

      <div className="albergue-operational-grid">
        
        {/* COLUNA ESQUERDA: STATUS DAS CASAS (Melhoria 1) */}
        <div className="albergue-dashboard-column albergue-dashboard-column-main">
             <div className="albergue-room-grid">
                {loading && <div>Carregando...</div>}
                {!loading && ocupacao && Object.entries(ocupacao.casas).map(([key, data]) => {
                    const livres = data.total - data.ocupadas;
                    const style = getStatusColor(livres);
                    const config = casaConfig[key] || { label: key };
                    const roomCardStyle = {
                      '--room-bg': style.bg,
                      '--room-border': style.border,
                      '--room-tone': style.text,
                      '--room-progress': `${(data.ocupadas / data.total) * 100}%`,
                    } as CSSProperties;

                    return (
                    <div
                        key={key}
                        onClick={() => handleCasaClick(key)}
                        className="albergue-room-card"
                        style={roomCardStyle}
                    >
                        {/* Barra de progresso visual no fundo */}
                        <div className="albergue-room-progress" />

                        <div className="albergue-room-content">
                            <div>
                                <h3>{config.label}</h3>
                                <span>Capacidade: {data.total}</span>
                            </div>
                            <div className="albergue-room-counter">
                                <strong>{livres}</strong>
                                <span>Livres</span>
                            </div>
                        </div>
                    </div>
                    );
                })}
             </div>
             
             {/* Histórico de Ocupação - Funcional com dados reais */}
             <div className="albergue-chart-panel">
                <div className="albergue-chart-head">
                    <div>
                        <h3>Histórico de ocupação</h3>
                        <p>
                            Ocupadas e novos ingressos por plantão, com capacidade como referência.
                        </p>
                    </div>
                    <div className="albergue-chart-period">
                        7 dias
                    </div>
                </div>

                <div className="albergue-chart-canvas">
                    {historyData.length > 0 ? (
                      <EChartCanvas ariaLabel="Histórico de ocupação do albergue" option={historicoChartOption} />
                    ) : (
                      <div className="albergue-empty-state">
                        {historicoLoading ? 'Carregando histórico...' : 'Sem histórico disponível'}
                      </div>
                    )}
                </div>

                <div className="albergue-chart-legend">
                    <span>
                        <i className="legend-dot occupancy" />
                        Ocupação
                    </span>
                    <span>
                        <i className="legend-dot capacity-context" />
                        Capacidade {totalVagas}
                    </span>
                    <span>
                        <i className="legend-line entries" />
                        Novos ingressos
                    </span>
                </div>
             </div>
        </div>

        {/* COLUNA DIREITA: TIMELINE E PREVISÃO (Melhoria 2) */}
        <div className="albergue-dashboard-column albergue-dashboard-column-side">
            
            {/* Widget de Ocupação Total */}
            <div className="albergue-occupancy-card">
                <div className="albergue-widget-label">Ocupação total</div>
                <div className="albergue-occupancy-ring">
                    <svg width="120" height="120" className="albergue-ring-svg">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#374151" strokeWidth="10" />
                        <circle
                            cx="60" cy="60" r="50" fill="none" stroke="#3B82F6" strokeWidth="10"
                            strokeDasharray={2 * Math.PI * 50}
                            strokeDashoffset={2 * Math.PI * 50 * (1 - ocupacaoPercent / 100)}
                            strokeLinecap="round"
                            className="albergue-ring-progress"
                        />
                    </svg>
                    <div className="albergue-ring-value">
                        {ocupacaoPercent}%
                    </div>
                </div>
                <div className="albergue-occupancy-stats">
                    <div>
                        <span>Total</span>
                        <strong>{totalVagas}</strong>
                    </div>
                    <div>
                         <span>Livres</span>
                         <strong className="success">{totalVagas - totalOcupadas}</strong>
                    </div>
                </div>
            </div>

            {/* Widget de Saídas Previstas - Destacado */}
            <div className="albergue-exit-card">
                <div className="albergue-exit-content">
                    {/* Título */}
                    <div className="albergue-exit-copy">
                        <div>
                            <div className="albergue-widget-label danger">
                                Saídas Previstas
                            </div>
                            <div className="albergue-exit-title">
                                Saem amanhã de manhã
                            </div>
                            <div className="albergue-exit-subtitle">
                                Checkout à meia-noite
                            </div>
                        </div>
                    </div>
                    
                    {/* Número Grande */}
                    <div className="albergue-exit-number">
                        <strong>
                            {checkoutsHoje}
                        </strong>
                        <span>
                            {checkoutsHoje === 0 ? 'Nenhuma saída' : checkoutsHoje === 1 ? 'Hóspede' : 'Hóspedes'}
                        </span>
                    </div>
                </div>
            </div>

        </div>
      </div>

      {/* MODAL E FLOATER */}
      {modalOpen && <PessoaCasaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} casa={selectedCasa} casaLabel={selectedCasaLabel} />}
      <PresenceFloater
        censoData={censoData}
        isTriagemEncerrada={isTriagemEncerrada}
        onCensoExpired={() => {
          setIsTriagemEncerrada(false);
          setCensoData(null);
        }}
        pendentesCount={pendentesCount}
        totalCount={totalAtivosPresenca}
      />
      
    </main>
  );
};

export default DashboardPage;
