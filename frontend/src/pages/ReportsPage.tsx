import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { Pie, Bar, getElementAtEvent } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadExcelCompatibleTable } from '../utils/spreadsheet';

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const ReportsPage = () => {
  // Dados Brutos
  const [rawData, setRawData] = useState<any[]>([]);
  const [operacionalResumo, setOperacionalResumo] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estado do Filtro Drill-down
  const [drillDown, setDrillDown] = useState<{ tipo: string, valor: any } | null>(null);
  
  // LGPD - Máscara de dados sensíveis
  const [lgpdMode, setLgpdMode] = useState(false);
  
  // Filtros Avançados
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    dataInicio: '',
    dataFim: '',
    quarto: '',
  });
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false);
  
  // Referências para os gráficos
  const pieChartRef = useRef<any>(null);
  const barChartRef = useRef<any>(null);

  // --- 1. CARGA DE DADOS DA API ---
  const carregarResumoOperacional = async () => {
    let url = '/api/relatorios/operacional-resumo';
    const params = new URLSearchParams();

    if (filtrosAvancados.dataInicio && filtrosAvancados.dataFim) {
      params.set('inicio', filtrosAvancados.dataInicio);
      params.set('fim', filtrosAvancados.dataFim);
    }

    const filtrosRel: any = {};
    if (filtrosAvancados.quarto) filtrosRel.quarto = filtrosAvancados.quarto;
    if (Object.keys(filtrosRel).length > 0) params.set('filtros', JSON.stringify(filtrosRel));
    if (params.toString()) url += `?${params.toString()}`;

    const response = await apiFetch(url);
    setOperacionalResumo(response);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      let url = '/api/relatorios/custom?campos=nome,cpf,data_nascimento,nis,cor,sexo,genero,raca,lgbt';
      
      if (filtrosAvancados.dataInicio && filtrosAvancados.dataFim) {
        url += `&inicio=${filtrosAvancados.dataInicio}&fim=${filtrosAvancados.dataFim}`;
      }
      
      const filtrosRel: any = {};
      if (filtrosAvancados.quarto) filtrosRel.quarto = filtrosAvancados.quarto;
      
      if (Object.keys(filtrosRel).length > 0) {
        url += `&filtros=${JSON.stringify(filtrosRel)}`;
      }
      
      const response = await apiFetch(url);
      const dados = Array.isArray(response) ? response : (response as any).data || [];
      setRawData(dados);
      await carregarResumoOperacional();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // --- 2. FILTRAGEM INTELIGENTE (DRILL-DOWN) ---
  
  // Funções LGPD - Mascarar dados sensíveis
  const mascararNome = (nome: string | undefined | null): string => {
    if (!nome) return '-';
    if (!lgpdMode) return nome;
    
    // Extrai iniciais de cada parte do nome
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) {
      return partes[0].charAt(0).toUpperCase() + '.';
    }
    // Primeira inicial + "." + última inicial + "."
    const iniciais = partes.map(p => p.charAt(0).toUpperCase() + '.').join(' ');
    return iniciais;
  };

  const mascararCPF = (cpf: string | undefined | null): string => {
    if (!cpf) return '-';
    if (!lgpdMode) return cpf;
    
    // Remove caracteres não numéricos
    const numeros = cpf.replace(/\D/g, '');
    if (numeros.length < 11) return '***.***.***-**';
    
    // Mostra apenas os 3 primeiros e 2 últimos dígitos
    return `${numeros.substring(0, 3)}.***.***-${numeros.substring(9, 11)}`;
  };

  // Função para normalizar cor/raça
  const normalizarCor = (valor: string | undefined | null): string => {
    if (!valor) return 'Não informado';
    const v = valor.toLowerCase().trim();
    if (v.includes('pard')) return 'Parda';
    if (v.includes('pret')) return 'Preta';
    if (v.includes('branc')) return 'Branca';
    if (v.includes('amarel')) return 'Amarela';
    if (v.includes('indígen') || v.includes('indigen')) return 'Indígena';
    return valor;
  };

  const filteredData = useMemo(() => {
    if (!drillDown) return rawData;
    
    return rawData.filter(item => {
      if (drillDown.tipo === 'cor') {
        // Usa a mesma normalização para filtrar por cor
        const corOriginal = item.cor || item.pessoa_cor || item.raca || item.pessoa_raca;
        const corNormalizada = normalizarCor(corOriginal);
        return corNormalizada === drillDown.valor;
      }
      if (drillDown.tipo === 'genero') {
        const genero = item.genero || item.pessoa_genero;
        // Se o filtro é "Não informado", buscar valores null/undefined/vazios
        if (drillDown.valor === 'Não informado') {
          return !genero || genero.trim() === '';
        }
        return genero === drillDown.valor;
      }
      // Para outros tipos
      const valor = item[drillDown.tipo] || item[`pessoa_${drillDown.tipo}`];
      return valor === drillDown.valor;
    });
  }, [rawData, drillDown]);

  // --- 3. DADOS PARA OS GRÁFICOS ---
  
  // Contagem por Cor/Raça - Normaliza os valores para comparação
  const contagemCor = useMemo(() => {
    const contagem: Record<string, number> = {};
    
    filteredData.forEach(d => {
      // Prioriza 'cor', depois 'raca', depois campos com prefixo 'pessoa_'
      const corOriginal = d.cor || d.pessoa_cor || d.raca || d.pessoa_raca;
      const corNormalizada = normalizarCor(corOriginal);
      contagem[corNormalizada] = (contagem[corNormalizada] || 0) + 1;
    });
    
    return contagem;
  }, [filteredData]);

  const coresOrdenadas = useMemo(() => {
    return Object.entries(contagemCor)
      .sort((a, b) => b[1] - a[1]) // Ordenar por quantidade decrescente
      .filter(([_, qtd]) => qtd > 0); // Remover zeros
  }, [contagemCor]);

  const chartCorData = {
    labels: coresOrdenadas.map(([cor]) => cor),
    datasets: [{
      data: coresOrdenadas.map(([_, qtd]) => qtd),
      backgroundColor: coresOrdenadas.map(([cor]) => {
        const cores: Record<string, string> = {
          'Parda': '#F59E0B',
          'Preta': '#1F2937',
          'Branca': '#E5E7EB',
          'Amarela': '#FCD34D',
          'Indígena': '#10B981',
          'Não informado': '#9CA3AF',
        };
        return cores[cor] || '#6366F1';
      }),
      borderWidth: 0,
    }]
  };

  // Contagem por Gênero
  const contagemGenero = useMemo(() => {
    const generos: Record<string, number> = {};
    filteredData.forEach(d => {
      const genero = d.genero || d.pessoa_genero;
      const label = genero && genero.trim() !== '' ? genero : 'Não informado';
      generos[label] = (generos[label] || 0) + 1;
    });
    return generos;
  }, [filteredData]);

  const chartGeneroData = {
    labels: Object.keys(contagemGenero),
    datasets: [{
      label: 'Quantidade',
      data: Object.values(contagemGenero),
      backgroundColor: ['#3B82F6', '#EC4899', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'],
      borderRadius: 6,
    }]
  };

  // KPIs
  const kpis = useMemo(() => {
    const idades = filteredData.map(d => {
      const nascimento = d.data_nascimento || d.pessoa_data_nascimento;
      if (!nascimento) return 0;
      const hoje = new Date();
      const nasc = new Date(nascimento);
      return Math.floor((hoje.getTime() - nasc.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    }).filter(i => i > 0);
    
    const mediaIdade = idades.length > 0 ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : 0;
    const lgbtCount = filteredData.filter(d => d.lgbt || d.pessoa_lgbt).length;
    
    return {
      total: rawData.length,
      filtrado: filteredData.length,
      mediaIdade,
      lgbtCount,
    };
  }, [rawData, filteredData]);

  // --- 4. HANDLERS DE CLIQUE (DRILL-DOWN) ---

  const handlePieClick = (event: any) => {
    if (!pieChartRef.current) return;
    const element = getElementAtEvent(pieChartRef.current, event);
    if (!element.length) return;

    const corClicada = coresOrdenadas[element[0].index]?.[0];
    if (corClicada) applyFilter('cor', corClicada);
  };

  const handleBarClick = (event: any) => {
    if (!barChartRef.current) return;
    const element = getElementAtEvent(barChartRef.current, event);
    if (!element.length) return;

    const generoClicado = chartGeneroData.labels[element[0].index];
    applyFilter('genero', generoClicado);
  };

  const applyFilter = (tipo: string, valor: any) => {
    if (drillDown?.tipo === tipo && drillDown?.valor === valor) {
      setDrillDown(null);
    } else {
      setDrillDown({ tipo, valor });
    }
  };

  // --- 5. EXPORTAÇÃO ---
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório de Gestão - Albergue', 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()} | Total: ${filteredData.length} registros`, 14, 22);
    if (drillDown) {
      doc.text(`Filtro aplicado: ${drillDown.tipo} = ${drillDown.valor}`, 14, 28);
    }
    if (lgpdMode) {
      doc.text('⚠️ Dados anonimizados conforme LGPD', 14, drillDown ? 34 : 28);
    }

    const tableRows = filteredData.map(row => [
      mascararNome(row.nome || row.pessoa_nome),
      mascararCPF(row.cpf || row.pessoa_cpf),
      row.genero || row.pessoa_genero || '-',
      row.cor || row.pessoa_cor || row.raca || '-',
    ]);

    autoTable(doc, {
      head: [['Nome', 'CPF', 'Gênero', 'Cor/Raça']],
      body: tableRows,
      startY: lgpdMode ? (drillDown ? 40 : 35) : (drillDown ? 35 : 30),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('relatorio-albergue.pdf');
  };

  const downloadExcel = () => {
    const excelData = filteredData.map(row => ({
      Nome: mascararNome(row.nome || row.pessoa_nome),
      CPF: mascararCPF(row.cpf || row.pessoa_cpf),
      NIS: row.nis || row.pessoa_nis || '-',
      Gênero: row.genero || row.pessoa_genero || 'Não informado',
      'Cor/Raça': row.cor || row.pessoa_cor || row.raca || '-',
      LGBT: (row.lgbt || row.pessoa_lgbt) ? 'Sim' : 'Não',
    }));

    downloadExcelCompatibleTable(excelData, 'relatorio-acolhidos.xls', 'Acolhidos');
  };

  // --- ESTILOS ---
  const cardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB' };
  const cardTitleStyle: React.CSSProperties = { fontSize: '16px', fontWeight: '700', color: '#1F2937', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  const hintStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 'normal', color: '#6B7280', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '10px' };

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif', paddingBottom: '100px' }}>
      
      {/* HEADER */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0 }}>Dashboard Analítico</h1>
          <p style={{ color: '#6B7280', margin: '4px 0 0' }}>Clique nos gráficos para filtrar os dados (Drill-down)</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Botão Conferência RMA */}
          <Link 
            to="/conferencia-rma"
            style={{ 
              backgroundColor: '#10B981', 
              color: 'white', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: '600',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
            }}
          >
            📊 Conferência RMA
          </Link>
          
          {/* Toggle LGPD */}
          <button 
            onClick={() => setLgpdMode(!lgpdMode)}
            title={lgpdMode ? 'Clique para mostrar dados completos' : 'Clique para ocultar dados sensíveis (LGPD)'}
            style={{ 
              backgroundColor: lgpdMode ? '#7C3AED' : '#E5E7EB', 
              color: lgpdMode ? 'white' : '#374151', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: lgpdMode ? '0 2px 4px rgba(124, 58, 237, 0.3)' : 'none'
            }}
          >
            {lgpdMode ? '🔒' : '🔓'} LGPD
          </button>
          
          {drillDown && (
            <button 
              onClick={() => setDrillDown(null)}
              style={{ backgroundColor: '#EF4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)' }}
            >
              ✕ Limpar: {drillDown.valor}
            </button>
          )}
          <button 
            onClick={() => setShowFiltrosAvancados(!showFiltrosAvancados)}
            style={{ backgroundColor: showFiltrosAvancados ? '#1F2937' : '#E5E7EB', color: showFiltrosAvancados ? 'white' : '#374151', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
          >
            ⚙️ Filtros
          </button>
          <button onClick={downloadPDF} style={{ backgroundColor: '#1F2937', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            📄 PDF
          </button>
          <button onClick={downloadExcel} style={{ backgroundColor: '#16A34A', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            📊 Excel
          </button>
        </div>
      </header>

      {/* FILTROS AVANÇADOS (COLAPSÁVEL) */}
      {showFiltrosAvancados && (
        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>Data Início</label>
              <input 
                type="date" 
                value={filtrosAvancados.dataInicio}
                onChange={e => setFiltrosAvancados(prev => ({ ...prev, dataInicio: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>Data Fim</label>
              <input 
                type="date" 
                value={filtrosAvancados.dataFim}
                onChange={e => setFiltrosAvancados(prev => ({ ...prev, dataFim: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '4px' }}>Quarto/Casa</label>
              <select 
                value={filtrosAvancados.quarto}
                onChange={e => setFiltrosAvancados(prev => ({ ...prev, quarto: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', backgroundColor: 'white' }}
              >
                <option value="">Todos</option>
                <option value="MASCULINA">Masculino</option>
                <option value="MISTA_MULHERES">Feminino</option>
                <option value="IDOSO">Idosos</option>
                <option value="LGBT">LGBT+</option>
              </select>
            </div>
            <button 
              onClick={carregarDados}
              disabled={loading}
              style={{ backgroundColor: '#2563EB', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              {loading ? 'Carregando...' : 'Aplicar'}
            </button>
          </div>
        </div>
      )}

      {/* KPIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard title="Total Cadastros" value={kpis.total} color="#3B82F6" />
        <KpiCard 
          title="Seleção Atual" 
          value={kpis.filtrado} 
          sub={drillDown ? `Filtrado por ${drillDown.valor}` : 'Sem filtros'} 
          color={drillDown ? '#10B981' : '#9CA3AF'} 
          isActive={!!drillDown}
        />
        <KpiCard title="Média de Idade" value={`${kpis.mediaIdade} Anos`} color="#F59E0B" sub="Da seleção atual" />
        <KpiCard title="LGBT+" value={kpis.lgbtCount} color="#8B5CF6" sub={`${kpis.total > 0 ? Math.round((kpis.lgbtCount / kpis.total) * 100) : 0}% do total`} />
      </div>

      {operacionalResumo && (
        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <h3 style={cardTitleStyle}>
            Resumo operacional do período
            <span style={hintStyle}>novos, retornos e faixa etária</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '18px' }}>
            <KpiCard title="Pessoas únicas" value={operacionalResumo.pessoasUnicas ?? 0} color="#2563EB" />
            <KpiCard title="Acessos/estadias" value={operacionalResumo.acessosPeriodo ?? 0} color="#0F9D58" />
            <KpiCard title="Novos acessos" value={operacionalResumo.novosAcessos ?? 0} color="#F59E0B" />
            <KpiCard title="Retornos" value={operacionalResumo.retornos ?? 0} color="#7C3AED" />
            <KpiCard title="Pernoites estimados" value={operacionalResumo.pernoitesEstimados ?? 0} color="#1F2937" />
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {(operacionalResumo.faixaEtaria ?? []).map((item: any) => {
              const max = Math.max(...(operacionalResumo.faixaEtaria ?? []).map((row: any) => Number(row.total || 0)), 1);
              const width = Math.round((Number(item.total || 0) / max) * 100);
              return (
                <div key={item.faixa} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 42px', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ color: '#374151', fontSize: '13px' }}>{item.faixa}</strong>
                  <span style={{ background: '#EEF2F7', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
                    <i style={{ display: 'block', width: `${width}%`, height: '100%', background: '#2563EB', borderRadius: '999px' }} />
                  </span>
                  <em style={{ color: '#111827', fontStyle: 'normal', fontWeight: 800 }}>{item.total}</em>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GRÁFICOS INTERATIVOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* GRÁFICO: GÊNERO */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>
            Por Gênero
            <span style={hintStyle}>🖱️ Clique nas barras</span>
          </h3>
          <div style={{ height: '280px' }}>
            {Object.keys(contagemGenero).length > 0 ? (
              <Bar 
                ref={barChartRef}
                data={chartGeneroData}
                onClick={handleBarClick}
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { 
                    y: { beginAtZero: true, grid: { color: '#F3F4F6' } },
                    x: { grid: { display: false } }
                  },
                  onHover: (event: any, chartElement: any) => { 
                    if (event.native?.target) {
                      (event.native.target as HTMLElement).style.cursor = chartElement.length ? 'pointer' : 'default'; 
                    }
                  }
                }} 
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
                {loading ? 'Carregando...' : 'Sem dados disponíveis'}
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO: COR/RAÇA */}
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>
            Por Cor/Raça
            <span style={hintStyle}>🖱️ Clique nas fatias</span>
          </h3>
          <div style={{ height: '280px', display: 'flex', justifyContent: 'center' }}>
            {coresOrdenadas.length > 0 ? (
              <Pie 
                ref={pieChartRef}
                data={chartCorData} 
                onClick={handlePieClick}
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'right' } },
                  onHover: (event: any, chartElement: any) => { 
                    if (event.native?.target) {
                      (event.native.target as HTMLElement).style.cursor = chartElement.length ? 'pointer' : 'default'; 
                    }
                  }
                }} 
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
                {loading ? 'Carregando...' : 'Sem dados disponíveis'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABELA DE DADOS */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>
          Listagem Detalhada
          {drillDown && (
            <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 'normal', backgroundColor: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: '6px' }}>
              Filtrando por: {drillDown.valor}
            </span>
          )}
        </h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '600px' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB', zIndex: 1 }}>
              <tr style={{ textAlign: 'left', color: '#6B7280', borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ padding: '14px 16px', fontWeight: '600' }}>Nome</th>
                <th style={{ padding: '14px 16px', fontWeight: '600' }}>CPF</th>
                <th style={{ padding: '14px 16px', fontWeight: '600' }}>Gênero</th>
                <th style={{ padding: '14px 16px', fontWeight: '600' }}>Cor/Raça</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                [...filteredData]
                  .sort((a, b) => (a.nome || a.pessoa_nome || '').localeCompare(b.nome || b.pessoa_nome || ''))
                  .map((d, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '500', color: '#1F2937' }}>
                        {(d.lgbt || d.pessoa_lgbt) && <span title="LGBT+" style={{ marginRight: '6px' }}>🏳️‍🌈</span>}
                        {mascararNome(d.nome || d.pessoa_nome)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6B7280' }}>{mascararCPF(d.cpf || d.pessoa_cpf)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8'
                        }}>
                          {d.genero || d.pessoa_genero || 'Não informado'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#374151' }}>{d.cor || d.pessoa_cor || d.raca || '-'}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    {loading ? 'Carregando dados...' : 'Nenhum registro encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px', color: '#9CA3AF', fontSize: '12px' }}>
        &copy; {new Date().getFullYear()} Sistema Albergue - Gestão Social
      </div>
    </div>
  );
};

// --- COMPONENTE KPI ---
const KpiCard = ({ title, value, sub, color, isActive }: { title: string; value: any; sub?: string; color: string; isActive?: boolean }) => (
  <div style={{ 
    backgroundColor: 'white', 
    padding: '20px', 
    borderRadius: '12px', 
    borderLeft: `4px solid ${color}`, 
    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
    transform: isActive ? 'scale(1.02)' : 'none',
    transition: 'all 0.2s'
  }}>
    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
    <div style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: '6px 0' }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: color, fontWeight: '600' }}>{sub}</div>}
  </div>
);

export default ReportsPage;
