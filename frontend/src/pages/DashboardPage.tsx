import { useState, useEffect } from 'react';
import { useOcupacaoTotal } from '../api';
import PessoaCasaModal from '../components/PessoaCasaModal';
import PresenceFloater from '../components/PresenceFloater';

// --- INTERFACES ---
interface OcupacaoData {
  total: { ocupadas: number; total: number; };
  casas: { [key: string]: { ocupadas: number; total: number; } };
}

// Configuração de Labels e Ícones
const casaConfig: Record<string, { label: string, icon: string }> = {
  MASCULINA: { label: 'Masculina', icon: '👨' },
  'MISTA_MULHERES': { label: 'Feminina', icon: '👩' },
  LGBT: { label: 'LGBT+', icon: '🏳️‍🌈' },
  IDOSOS: { label: 'Idosos', icon: '👴' },
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
    const hoje = new Date().toISOString().split('T')[0];
    const lastTriagemDate = localStorage.getItem('lastTriagemDate');
    if (lastTriagemDate === hoje && localStorage.getItem('triagemEncerrada') === 'true') {
      setIsTriagemEncerrada(true);
      const storedCenso = localStorage.getItem('censoData');
      if (storedCenso) {
        try {
          setCensoData(JSON.parse(storedCenso));
        } catch (e) {
          console.error('Erro ao parsear censoData:', e);
        }
      }
    }
  }, []);

  // --- HOOKS DE DADOS ---
  const { data: initialOcupacao, loading: initialLoading } = useOcupacaoTotal();

  useEffect(() => { if (initialOcupacao) setOcupacao(initialOcupacao); }, [initialOcupacao]);

  // Carregar dados de Previsão (Simulação de API)
  useEffect(() => {
    const fetchDadosOperacionais = async () => {
      try {
        // 1. Buscar pendentes de presença (Presença não marcada)
        const resAtivos = await fetch('/api/pessoas/ativos');
        const ativos = resAtivos.ok ? await resAtivos.json() : [];
        const ativosList = Array.isArray(ativos) ? ativos : [];
        setPendentesCount(ativosList.filter((a: any) => !a.presente).length);
        setTotalAtivosPresenca(ativosList.length);
        
        // 2. Buscar saídas previstas para hoje (estadias que terminam hoje)
        const resSaidas = await fetch('/api/dashboard/saidas-previstas-hoje');
        const saidasData = resSaidas.ok ? await resSaidas.json() : { count: 0 };
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

  // Histórico de Ocupação (últimos 7 dias) - Persistido em localStorage
  const [historyData, setHistoryData] = useState<{date: string; value: number}[]>([]);
  
  useEffect(() => {
    if (totalOcupadas === 0) return; // Aguardar dados carregarem
    
    const hoje = new Date().toISOString().split('T')[0];
    const storageKey = 'ocupacaoHistorico';
    
    // Carregar histórico existente
    let historico: {date: string; value: number}[] = [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) historico = JSON.parse(stored);
    } catch (e) { console.error('Erro ao carregar histórico:', e); }
    
    // Verificar se já salvou hoje
    const jaSalvouHoje = historico.some(h => h.date === hoje);
    if (!jaSalvouHoje) {
      historico.push({ date: hoje, value: totalOcupadas });
    } else {
      // Atualizar valor de hoje (caso mude ao longo do dia)
      historico = historico.map(h => h.date === hoje ? { ...h, value: totalOcupadas } : h);
    }
    
    // Manter apenas os últimos 7 dias
    historico = historico.slice(-7);
    localStorage.setItem(storageKey, JSON.stringify(historico));
    
    // Preencher dias faltantes para ter sempre 7 barras
    const ultimos7Dias: {date: string; value: number}[] = [];
    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      const dateStr = data.toISOString().split('T')[0];
      const existente = historico.find(h => h.date === dateStr);
      ultimos7Dias.push({ 
        date: dateStr, 
        value: existente?.value ?? 0 
      });
    }
    
    setHistoryData(ultimos7Dias);
  }, [totalOcupadas]);

  // Labels dos dias da semana
  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00'); // Evitar problemas de timezone
    const dias = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    return dias[date.getDay()];
  };

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
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {loading && <div>Carregando...</div>}
                {!loading && ocupacao && Object.entries(ocupacao.casas).map(([key, data]) => {
                    const livres = data.total - data.ocupadas;
                    const style = getStatusColor(livres);
                    const config = casaConfig[key] || { label: key, icon: '🏠' };

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '24px', backgroundColor: 'rgba(255,255,255,0.5)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {config.icon}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1F2937' }}>{config.label}</h3>
                                    <span style={{ fontSize: '12px', color: '#6B7280' }}>Capacidade: {data.total}</span>
                                </div>
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
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#374151', marginBottom: '16px' }}>Histórico de Ocupação (7 Dias)</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '140px', paddingBottom: '10px' }}>
                    {historyData.map((item, idx) => {
                        const isToday = idx === historyData.length - 1;
                        const barHeight = totalVagas > 0 ? (item.value / totalVagas) * 100 : 0;
                        
                        return (
                        <div key={item.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                             {/* Valor numérico acima da barra */}
                             <span style={{ 
                                 fontSize: '11px', 
                                 fontWeight: isToday ? '700' : '500', 
                                 color: isToday ? '#2563EB' : '#6B7280',
                                 marginBottom: '4px'
                             }}>
                                 {item.value > 0 ? item.value : '-'}
                             </span>
                             
                             {/* Barra */}
                             <div 
                                style={{ 
                                    width: '60%', 
                                    backgroundColor: isToday ? '#2563EB' : '#E5E7EB', 
                                    height: `${Math.max(barHeight, 4)}px`, 
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 1s',
                                    minHeight: '4px'
                                }} 
                             />
                             
                             {/* Label do dia */}
                             <span style={{ 
                                 fontSize: '11px', 
                                 color: isToday ? '#2563EB' : '#6B7280', 
                                 marginTop: '6px',
                                 fontWeight: isToday ? '700' : '400'
                             }}>
                                 {getDayLabel(item.date)}
                             </span>
                        </div>
                    );})}
                </div>
                
                {/* Legenda */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', fontSize: '11px', color: '#9CA3AF' }}>
                    <span>📊 Capacidade total: <strong style={{color: '#374151'}}>{totalVagas}</strong></span>
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
                    {/* Ícone e Título */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ 
                            backgroundColor: '#DC2626', 
                            width: '64px', 
                            height: '64px', 
                            borderRadius: '16px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)'
                        }}>
                            <span style={{ fontSize: '32px', filter: 'brightness(0) invert(1)' }}>🚪</span>
                        </div>
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
                
                {/* Barra de Informação Adicional */}
                <div style={{ 
                    marginTop: '24px', 
                    paddingTop: '20px', 
                    borderTop: '2px solid rgba(220, 38, 38, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <div style={{ 
                        backgroundColor: 'rgba(220, 38, 38, 0.15)', 
                        padding: '8px 12px', 
                        borderRadius: '8px',
                        flex: 1
                    }}>
                        <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: '600' }}>
                            ℹ️ Vagas livres amanhã de manhã
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>

      {/* MODAL E FLOATER */}
      {modalOpen && <PessoaCasaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} casa={selectedCasa} casaLabel={selectedCasaLabel} />}
      <PresenceFloater pendentesCount={pendentesCount} totalCount={totalAtivosPresenca} censoData={censoData} isTriagemEncerrada={isTriagemEncerrada} />
      
      {/* Estilos responsivos inline para grid */}
      <style>{`
        @media (min-width: 1024px) {
            .col-left { grid-column: span 8 !important; }
            .col-right { grid-column: span 4 !important; }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
