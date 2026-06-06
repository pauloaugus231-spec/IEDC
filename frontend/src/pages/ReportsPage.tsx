import { useState, useMemo, useEffect, useCallback, type CSSProperties } from 'react';
import { apiFetch } from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import EChartCanvas, { type IEDCChartOption } from '../components/EChartCanvas';
import { MetricCard, MetricGrid, PageHeader, Panel, TableShell } from '../components/DesignSystem';
import { TOOLTIP_STYLE, AXIS_LABEL_STYLE, GRID_LINE_STYLE, CHART_COLORS_GENERO, CHART_COLORS_RACA } from '../styles/echarts-theme-iedc';
import { downloadExcelCompatibleTable } from '../utils/spreadsheet';

interface ReportRow {
  nome?: string | null;
  pessoa_nome?: string | null;
  cpf?: string | null;
  pessoa_cpf?: string | null;
  nis?: string | null;
  pessoa_nis?: string | null;
  data_nascimento?: string | null;
  pessoa_data_nascimento?: string | null;
  genero?: string | null;
  pessoa_genero?: string | null;
  cor?: string | null;
  pessoa_cor?: string | null;
  raca?: string | null;
  pessoa_raca?: string | null;
  lgbt?: boolean | null;
  pessoa_lgbt?: boolean | null;
}

interface OperationalAgeRange {
  faixa: string;
  total: number | string | null;
}

interface OperationalSummary {
  pessoasUnicas?: number | null;
  acessosPeriodo?: number | null;
  novosAcessos?: number | null;
  retornos?: number | null;
  pernoitesEstimados?: number | null;
  faixaEtaria?: OperationalAgeRange[] | null;
}

type DrillDown = {
  tipo: 'cor' | 'genero';
  valor: string;
};

type RelatorioFiltros = Partial<Record<'quarto', string>>;

type CustomReportResponse = ReportRow[] | {
  data?: ReportRow[];
};

function normalizeReportRows(response: CustomReportResponse): ReportRow[] {
  if (Array.isArray(response)) return response;
  return Array.isArray(response.data) ? response.data : [];
}


const ReportsPage = () => {
  // Dados Brutos
  const [rawData, setRawData] = useState<ReportRow[]>([]);
  const [operacionalResumo, setOperacionalResumo] = useState<OperationalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estado do Filtro Drill-down
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  
  // LGPD - Máscara de dados sensíveis
  const [lgpdMode, setLgpdMode] = useState(false);
  
  // Filtros Avançados
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    dataInicio: '',
    dataFim: '',
    quarto: '',
  });
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false);
  
  // --- 1. CARGA DE DADOS DA API ---
  const carregarResumoOperacional = async () => {
    let url = '/api/relatorios/operacional-resumo';
    const params = new URLSearchParams();

    if (filtrosAvancados.dataInicio && filtrosAvancados.dataFim) {
      params.set('inicio', filtrosAvancados.dataInicio);
      params.set('fim', filtrosAvancados.dataFim);
    }

    const filtrosRel: RelatorioFiltros = {};
    if (filtrosAvancados.quarto) filtrosRel.quarto = filtrosAvancados.quarto;
    if (Object.keys(filtrosRel).length > 0) params.set('filtros', JSON.stringify(filtrosRel));
    if (params.toString()) url += `?${params.toString()}`;

    const response = await apiFetch<OperationalSummary>(url);
    setOperacionalResumo(response);
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      let url = '/api/relatorios/custom?campos=nome,cpf,data_nascimento,nis,cor,sexo,genero,raca,lgbt';
      
      if (filtrosAvancados.dataInicio && filtrosAvancados.dataFim) {
        url += `&inicio=${filtrosAvancados.dataInicio}&fim=${filtrosAvancados.dataFim}`;
      }
      
      const filtrosRel: RelatorioFiltros = {};
      if (filtrosAvancados.quarto) filtrosRel.quarto = filtrosAvancados.quarto;
      
      if (Object.keys(filtrosRel).length > 0) {
        url += `&filtros=${JSON.stringify(filtrosRel)}`;
      }
      
      const response = await apiFetch<CustomReportResponse>(url);
      const dados = normalizeReportRows(response);
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

  const pieChartOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical' as const,
        right: 0,
        top: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 12, fontWeight: 700, color: '#29354a' },
      },
      series: [
        {
          type: 'pie',
          radius: '80%',
          center: ['40%', '50%'],
          data: coresOrdenadas.map(([cor, qtd]) => ({
            name: cor,
            value: qtd,
            itemStyle: { color: CHART_COLORS_RACA[cor] || '#6366F1' },
          })),
          label: { show: false },
          itemStyle: { borderWidth: 0 },
          emphasis: { scaleSize: 6 },
          animationDuration: 850,
          animationEasing: 'quarticOut',
        },
      ],
    }),
    [coresOrdenadas],
  );

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

  const generoLabels = Object.keys(contagemGenero);
  const generoValues = Object.values(contagemGenero);

  const barChartOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: {
        ...TOOLTIP_STYLE,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: { left: 42, right: 16, top: 12, bottom: 28, containLabel: false },
      xAxis: {
        type: 'category',
        data: generoLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: AXIS_LABEL_STYLE,
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: GRID_LINE_STYLE },
        axisLabel: AXIS_LABEL_STYLE,
      },
      series: [
        {
          type: 'bar',
          data: generoValues.map((val, i) => ({
            value: val,
            itemStyle: { color: CHART_COLORS_GENERO[i % CHART_COLORS_GENERO.length] },
          })),
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          animationDuration: 850,
          animationEasing: 'quarticOut',
        },
      ],
    }),
    [generoLabels, generoValues],
  );

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

  const applyFilter = (tipo: DrillDown['tipo'], valor: string) => {
    if (drillDown?.tipo === tipo && drillDown?.valor === valor) {
      setDrillDown(null);
    } else {
      setDrillDown({ tipo, valor });
    }
  };

  const handlePieClick = useCallback(
    (params: { dataIndex: number; name: string }) => {
      const corClicada = coresOrdenadas[params.dataIndex]?.[0];
      if (corClicada) applyFilter('cor', corClicada);
    },
    [coresOrdenadas, drillDown],
  );

  const handleBarClick = useCallback(
    (params: { dataIndex: number; name: string }) => {
      const generoClicado = generoLabels[params.dataIndex];
      if (generoClicado) applyFilter('genero', generoClicado);
    },
    [generoLabels, drillDown],
  );

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
      doc.text('Dados anonimizados conforme LGPD.', 14, drillDown ? 34 : 28);
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

  return (
    <main className="page-band albergue-reports-page">
      <PageHeader
        eyebrow="Albergue Noturno"
        title="Dashboard analítico"
        description="Leitura gerencial de perfil, recortes e movimentação do período. Os gráficos funcionam como filtros operacionais."
        actions={(
          <div className="albergue-report-actions">
          <button 
            onClick={() => setLgpdMode(!lgpdMode)}
            title={lgpdMode ? 'Clique para mostrar dados completos' : 'Clique para ocultar dados sensíveis (LGPD)'}
            className={`ds-button ${lgpdMode ? 'active' : 'secondary'}`}
          >
            {lgpdMode ? 'LGPD ativa' : 'Anonimizar LGPD'}
          </button>
          
          {drillDown && (
            <button 
              onClick={() => setDrillDown(null)}
              className="ds-button danger"
            >
              Limpar filtro: {drillDown.valor}
            </button>
          )}
          <button 
            onClick={() => setShowFiltrosAvancados(!showFiltrosAvancados)}
            className={`ds-button ${showFiltrosAvancados ? 'active' : 'secondary'}`}
          >
            {showFiltrosAvancados ? 'Ocultar filtros' : 'Filtrar dados'}
          </button>
          <button onClick={downloadPDF} className="ds-button secondary">
            Baixar PDF
          </button>
          <button onClick={downloadExcel} className="ds-button secondary">
            Baixar Excel
          </button>
          </div>
        )}
      />

      {/* FILTROS AVANÇADOS (COLAPSÁVEL) */}
      {showFiltrosAvancados && (
        <Panel className="albergue-filter-panel" title="Filtros do relatório" subtitle="Use para recortar período e casa sem perder a leitura executiva.">
          <div className="albergue-filter-grid">
            <div>
              <label>Data início</label>
              <input 
                type="date" 
                value={filtrosAvancados.dataInicio}
                onChange={e => setFiltrosAvancados(prev => ({ ...prev, dataInicio: e.target.value }))}
              />
            </div>
            <div>
              <label>Data fim</label>
              <input 
                type="date" 
                value={filtrosAvancados.dataFim}
                onChange={e => setFiltrosAvancados(prev => ({ ...prev, dataFim: e.target.value }))}
              />
            </div>
            <div>
              <label>Quarto/Casa</label>
              <select 
                value={filtrosAvancados.quarto}
                onChange={e => setFiltrosAvancados(prev => ({ ...prev, quarto: e.target.value }))}
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
              className="ds-button"
            >
              {loading ? 'Carregando...' : 'Aplicar'}
            </button>
          </div>
        </Panel>
      )}

      {/* KPIS */}
      <MetricGrid>
        <MetricCard label="Total de cadastros" value={kpis.total} detail="Base carregada" />
        <MetricCard
          label="Seleção atual"
          value={kpis.filtrado}
          detail={drillDown ? `Filtrado por ${drillDown.valor}` : 'Sem filtros'}
          tone={drillDown ? 'success' : 'muted'}
        />
        <MetricCard label="Média de idade" value={`${kpis.mediaIdade} anos`} detail="Seleção atual" tone="warning" />
        <MetricCard label="LGBT+" value={kpis.lgbtCount} detail={`${kpis.total > 0 ? Math.round((kpis.lgbtCount / kpis.total) * 100) : 0}% do total`} />
      </MetricGrid>

      {operacionalResumo && (
        <Panel
          className="albergue-operational-summary"
          title="Resumo operacional do período"
          subtitle="Novos acessos, retornos, pernoites e faixa etária."
        >
          <MetricGrid className="albergue-summary-grid">
            <MetricCard label="Pessoas únicas" value={operacionalResumo.pessoasUnicas ?? 0} />
            <MetricCard label="Acessos/estadias" value={operacionalResumo.acessosPeriodo ?? 0} tone="success" />
            <MetricCard label="Novos acessos" value={operacionalResumo.novosAcessos ?? 0} tone="warning" />
            <MetricCard label="Retornos" value={operacionalResumo.retornos ?? 0} />
            <MetricCard label="Pernoites estimados" value={operacionalResumo.pernoitesEstimados ?? 0} />
          </MetricGrid>

          <div className="albergue-age-bars">
            {(operacionalResumo.faixaEtaria ?? []).map((item) => {
              const max = Math.max(...(operacionalResumo.faixaEtaria ?? []).map((row) => Number(row.total || 0)), 1);
              const width = Math.round((Number(item.total || 0) / max) * 100);
              const ageBarStyle = { '--age-width': `${width}%` } as CSSProperties;
              return (
                <div key={item.faixa} className="albergue-age-row">
                  <strong>{item.faixa}</strong>
                  <span>
                    <i style={ageBarStyle} />
                  </span>
                  <em>{item.total}</em>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* GRÁFICOS INTERATIVOS */}
      <div className="albergue-report-chart-grid">
        
        {/* GRÁFICO: GÊNERO */}
        <Panel
          title="Por gênero"
          actions={<span className="ds-hint">Clique nas barras</span>}
        >
          <div className="albergue-report-chart-box">
            {Object.keys(contagemGenero).length > 0 ? (
              <EChartCanvas
                ariaLabel="Gráfico por gênero"
                option={barChartOption}
                onDataClick={handleBarClick}
              />
            ) : (
              <div className="albergue-empty-state">
                {loading ? 'Carregando...' : 'Sem dados disponíveis'}
              </div>
            )}
          </div>
        </Panel>

        {/* GRÁFICO: COR/RAÇA */}
        <Panel
          title="Por cor/raça"
          actions={<span className="ds-hint">Clique nas fatias</span>}
        >
          <div className="albergue-report-chart-box centered">
            {coresOrdenadas.length > 0 ? (
              <EChartCanvas
                ariaLabel="Gráfico por cor/raça"
                option={pieChartOption}
                onDataClick={handlePieClick}
              />
            ) : (
              <div className="albergue-empty-state">
                {loading ? 'Carregando...' : 'Sem dados disponíveis'}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* TABELA DE DADOS */}
      <Panel
        title="Listagem detalhada"
        actions={drillDown ? <span className="ds-hint warning">Filtrando por: {drillDown.valor}</span> : null}
      >
        <TableShell className="albergue-report-table">
          <table className="report-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Gênero</th>
                <th>Cor/Raça</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                [...filteredData]
                  .sort((a, b) => (a.nome || a.pessoa_nome || '').localeCompare(b.nome || b.pessoa_nome || ''))
                  .map((d, idx) => (
                    <tr key={idx}>
                      <td>
                        {(d.lgbt || d.pessoa_lgbt) && <span title="LGBT+" className="albergue-identity-tag">LGBT+</span>}
                        {mascararNome(d.nome || d.pessoa_nome)}
                      </td>
                      <td>{mascararCPF(d.cpf || d.pessoa_cpf)}</td>
                      <td>
                        <span className="albergue-report-badge">
                          {d.genero || d.pessoa_genero || 'Não informado'}
                        </span>
                      </td>
                      <td>{d.cor || d.pessoa_cor || d.raca || '-'}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={4} className="albergue-table-empty">
                    {loading ? 'Carregando dados...' : 'Nenhum registro encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableShell>
      </Panel>

      <div className="albergue-report-footer">
        &copy; {new Date().getFullYear()} Sistema Albergue - Gestão Social
      </div>
    </main>
  );
};

export default ReportsPage;
