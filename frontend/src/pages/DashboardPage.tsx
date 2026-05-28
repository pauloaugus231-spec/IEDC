import { useState, useEffect, useMemo } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { apiFetch, useOcupacaoHistorico, useOcupacaoTotal } from '../api';
import PessoaCasaModal from '../components/PessoaCasaModal';
import PresenceFloater from '../components/PresenceFloater';
import { clearTriagemCensoStorage, getTriagemCensoStorageState } from '../utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip);

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

  const maiorCapacidadeHistorica = Math.max(totalVagas, ...historyData.map((item) => item.total), 1);
  const maiorIngressoHistorico = Math.max(...historyData.map((item) => item.ingressos), 0);
  const historicoChartKey = historyData
    .map((item) => `${item.data}-${item.ocupadas}-${item.ingressos}`)
    .join('|');

  const historicoChartData = useMemo<ChartData<'bar' | 'line', number[], string>>(
    () => ({
      labels: historyData.map((item) => {
        const date = new Date(`${item.data}T12:00:00`);
        return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
      }),
      datasets: [
        {
          type: 'bar',
          label: 'Ocupação',
          data: historyData.map((item) => item.ocupadas),
          yAxisID: 'y',
          backgroundColor: 'rgba(37, 99, 235, 0.86)',
          borderColor: '#2563eb',
          borderRadius: 10,
          borderSkipped: false,
          borderWidth: 1,
          hoverBackgroundColor: '#1d4ed8',
          maxBarThickness: 42,
        },
        {
          type: 'line',
          label: 'Capacidade máxima',
          data: historyData.map((item) => item.total || totalVagas),
          yAxisID: 'y',
          borderColor: '#172033',
          borderDash: [7, 6],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0,
        },
        {
          type: 'line',
          label: 'Novos ingressos',
          data: historyData.map((item) => item.ingressos),
          yAxisID: 'yIngressos',
          borderColor: '#0f9d58',
          backgroundColor: '#0f9d58',
          borderWidth: 3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#0f9d58',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
        },
      ],
    }),
    [historyData, totalVagas],
  );

  const historicoChartOptions = useMemo<ChartOptions<'bar' | 'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeOutQuart',
        delay: (context) => {
          if (context.type !== 'data') return 0;
          return context.dataIndex * 90 + context.datasetIndex * 140;
        },
      },
      animations: {
        y: {
          from: 0,
          duration: 950,
          easing: 'easeOutQuart',
        },
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
            label: (context) => {
              const label = context.dataset.label ?? '';
              if (label === 'Novos ingressos') return `${label}: ${context.parsed.y}`;
              if (label === 'Capacidade máxima') return `${label}: ${context.parsed.y} camas`;
              return `${label}: ${context.parsed.y} ocupadas`;
            },
            afterBody: (items) => {
              const point = historyData[items[0]?.dataIndex ?? -1];
              return point ? [`${point.percentual}% de ocupação no dia`] : [];
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
          suggestedMax: Math.ceil(maiorCapacidadeHistorica * 1.08),
          border: {
            display: false,
          },
          grid: {
            color: 'rgba(104, 119, 142, 0.12)',
          },
          ticks: {
            color: '#7a879a',
            precision: 0,
            font: {
              size: 11,
              weight: 700,
            },
          },
        },
        yIngressos: {
          position: 'right',
          min: 0,
          suggestedMax: Math.max(5, maiorIngressoHistorico + 2),
          border: {
            display: false,
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: '#0f9d58',
            precision: 0,
            font: {
              size: 11,
              weight: 700,
            },
          },
        },
      },
    }),
    [historyData, maiorCapacidadeHistorica, maiorIngressoHistorico],
  );

  return (
    <div style={{ padding: '24px', backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: 'Inter, sans-serif', paddingBottom: '100px' }}>
      
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0 }}>Painel de Controle</h1>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>Resumo operacional do dia</p>
        </div>
        <div style={{ fontSize: '12px', backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '6px 12px', borderRadius: '20px', fontWeight: '600' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        
        {/* COLUNA ESQUERDA: STATUS DAS CASAS (Melhoria 1) */}
        <div style={{ gridColumn: 'span 12' }} className="col-left">
             <div className="room-status-grid">
                {loading && <div>Carregando...</div>}
                {!loading && ocupacao && Object.entries(ocupacao.casas).map(([key, data]) => {
                    const livres = data.total - data.ocupadas;
                    const style = getStatusColor(livres);
                    const config = casaConfig[key] || { label: key };

                    return (
                    <div
                        key={key}
                        onClick={() => handleCasaClick(key)}
                        style={{
                            backgroundColor: style.bg,
                            border: `1px solid ${style.border}`,
                            borderRadius: '16px',
                            padding: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Barra de progresso visual no fundo */}
                        <div style={{ 
                            position: 'absolute', bottom: 0, left: 0, height: '4px', backgroundColor: style.text, 
                            width: `${(data.ocupadas / data.total) * 100}%`, opacity: 0.3 
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1F2937' }}>{config.label}</h3>
                                <span style={{ fontSize: '12px', color: '#6B7280' }}>Capacidade: {data.total}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '24px', fontWeight: '800', color: style.text }}>{livres}</span>
                                <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '700', color: style.text, opacity: 0.8 }}>Livres</div>
                            </div>
                        </div>
                    </div>
                    );
                })}
             </div>
             
             {/* Histórico de Ocupação - Funcional com dados reais */}
             <div style={{ marginTop: '24px', backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#374151', margin: 0 }}>Histórico de Ocupação (7 Dias)</h3>
                        <p style={{ color: '#6B7280', fontSize: '12px', fontWeight: 600, margin: '4px 0 0' }}>
                            Ocupadas, capacidade máxima e novos ingressos por plantão.
                        </p>
                    </div>
                    <div style={{ color: '#1E40AF', backgroundColor: '#DBEAFE', borderRadius: '999px', fontSize: '11px', fontWeight: 800, padding: '6px 10px', whiteSpace: 'nowrap' }}>
                        7 dias
                    </div>
                </div>

                <div style={{ position: 'relative', height: '218px' }}>
                    {historyData.length > 0 ? (
                      <Chart<'bar' | 'line', number[], string>
                        key={historicoChartKey}
                        type="bar"
                        data={historicoChartData}
                        options={historicoChartOptions}
                      />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontWeight: 700 }}>
                        {historicoLoading ? 'Carregando histórico...' : 'Sem histórico disponível'}
                      </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '14px', fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <i style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#2563EB', display: 'inline-block' }} />
                        Ocupação
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <i style={{ width: '18px', borderTop: '2px dashed #172033', display: 'inline-block' }} />
                        Capacidade {totalVagas}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <i style={{ width: '18px', borderTop: '3px solid #0F9D58', display: 'inline-block' }} />
                        Novos ingressos
                    </span>
                </div>
             </div>
        </div>

        {/* COLUNA DIREITA: TIMELINE E PREVISÃO (Melhoria 2) */}
        <div style={{ gridColumn: 'span 12' }} className="col-right">
            
            {/* Widget de Ocupação Total */}
            <div style={{ backgroundColor: '#1F2937', borderRadius: '16px', padding: '24px', color: 'white', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '8px' }}>Ocupação Total</div>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 16px' }}>
                    <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#374151" strokeWidth="10" />
                        <circle
                            cx="60" cy="60" r="50" fill="none" stroke="#3B82F6" strokeWidth="10"
                            strokeDasharray={2 * Math.PI * 50}
                            strokeDashoffset={2 * Math.PI * 50 * (1 - ocupacaoPercent / 100)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                        />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px', fontWeight: 'bold' }}>
                        {ocupacaoPercent}%
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div>
                        <div style={{ opacity: 0.6 }}>Total</div>
                        <div style={{ fontWeight: 'bold' }}>{totalVagas}</div>
                    </div>
                    <div>
                         <div style={{ opacity: 0.6 }}>Livres</div>
                         <div style={{ fontWeight: 'bold', color: '#34D399' }}>{totalVagas - totalOcupadas}</div>
                    </div>
                </div>
            </div>

            {/* Widget de Saídas Previstas - Destacado */}
            <div style={{ 
                background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', 
                borderRadius: '20px', 
                padding: '32px', 
                border: '2px solid #FCA5A5',
                boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.1), 0 2px 4px -1px rgba(220, 38, 38, 0.06)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Título */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                Saídas Previstas
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#7F1D1D', lineHeight: '1.2' }}>
                                Saem amanhã de manhã
                            </div>
                            <div style={{ fontSize: '13px', color: '#991B1B', marginTop: '4px' }}>
                                Checkout à meia-noite
                            </div>
                        </div>
                    </div>
                    
                    {/* Número Grande */}
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                            fontSize: '64px', 
                            fontWeight: '800', 
                            color: '#DC2626', 
                            lineHeight: '1',
                            textShadow: '2px 2px 4px rgba(220, 38, 38, 0.2)'
                        }}>
                            {checkoutsHoje}
                        </div>
                        <div style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#991B1B', 
                            marginTop: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {checkoutsHoje === 0 ? 'Nenhuma saída' : checkoutsHoje === 1 ? 'Hóspede' : 'Hóspedes'}
                        </div>
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
      
      {/* Estilos responsivos inline para grid */}
      <style>{`
        .room-status-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
        }

        @media (min-width: 1024px) {
            .col-left { grid-column: span 8 !important; }
            .col-right { grid-column: span 4 !important; }
        }

        @media (max-width: 640px) {
            .room-status-grid {
                grid-template-columns: 1fr;
            }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
