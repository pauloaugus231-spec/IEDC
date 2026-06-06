import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCrecheAfericao } from '../api';
import EChartCanvas, { type IEDCChartOption } from '../components/EChartCanvas';
import { MetricCard, MetricGrid, PageHeader } from '../components/DesignSystem';
import { TOOLTIP_STYLE, AXIS_LABEL_STYLE, AXIS_LABEL_DARK, GRID_LINE_STYLE, CHART_COLORS_CRECHE_RACA } from '../styles/echarts-theme-iedc';
import { downloadExcelCompatibleTable } from '../utils/spreadsheet';
import '../styles/institutional.css';

const camposAfericao = [
  'Nome',
  'CPF',
  'Data de nascimento',
  'NIS',
  'Data de ingresso',
  'Sexo',
  'Raça/cor',
];

const relatorios = [
  {
    nome: 'Instrumento de aferição',
    descricao: 'Base mensal para conferência com nome, CPF, nascimento, NIS e ingresso.',
    status: 'Pronto para uso',
  },
  {
    nome: 'Frequência mensal',
    descricao: 'Resumo por turma, faltas, presença e sinais de acompanhamento.',
    status: 'Modelo inicial',
  },
  {
    nome: 'Prestação de contas',
    descricao: 'Números consolidados para coordenação e gestão institucional.',
    status: 'Modelo inicial',
  },
];

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function maskName(nome: string, enabled: boolean) {
  if (!enabled) return nome || '-';
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .map((parte) => `${parte.charAt(0).toUpperCase()}.`)
    .join(' ') || '-';
}

function maskDocument(value: string | null | undefined, enabled: boolean, visibleStart = 3, visibleEnd = 2) {
  if (!value) return '-';
  if (!enabled) return value;

  const digits = value.replace(/\D/g, '');
  if (!digits) return '***';

  const start = digits.slice(0, visibleStart);
  const end = digits.slice(-visibleEnd);
  return `${start}${'*'.repeat(Math.max(digits.length - visibleStart - visibleEnd, 3))}${end}`;
}

function normalizarSexo(value?: string | null) {
  const sexo = (value || '').toLowerCase().trim();

  if (sexo.includes('masc') || sexo.includes('menino')) return 'Menino';
  if (sexo.includes('fem') || sexo.includes('menina')) return 'Menina';
  return 'Não informado';
}

function normalizarRacaCor(value?: string | null) {
  if (!value) return 'Não informado';

  const raca = value.toLowerCase().trim();
  if (raca.includes('branc')) return 'Branca';
  if (raca.includes('pard')) return 'Parda';
  if (raca.includes('pret')) return 'Preta';
  if (raca.includes('negr')) return 'Negra';
  if (raca.includes('indígen') || raca.includes('indigen')) return 'Indígena';
  if (raca.includes('amarel')) return 'Amarela';
  return value;
}

const CrecheReportsPage = () => {
  const [lgpdMode, setLgpdMode] = useState(false);
  const [drillDown, setDrillDown] = useState<{ tipo: 'genero' | 'racaCor'; valor: string } | null>(null);
  const { data: afericao, loading, error } = useCrecheAfericao();

  const filteredAfericao = useMemo(() => {
    if (!drillDown) return afericao;

    return afericao.filter((linha) => {
      if (drillDown.tipo === 'genero') return normalizarSexo(linha.sexo) === drillDown.valor;
      return normalizarRacaCor(linha.racaCor) === drillDown.valor;
    });
  }, [afericao, drillDown]);

  const pendencias = filteredAfericao.filter((linha) => linha.nisStatus === 'Pendente').length;
  const turmas = useMemo(() => new Set(filteredAfericao.map((linha) => linha.turma)).size, [filteredAfericao]);
  const responsaveis = useMemo(
    () => new Set(filteredAfericao.map((linha) => linha.responsavel).filter(Boolean)).size,
    [filteredAfericao],
  );
  const mediaIdade = useMemo(() => {
    if (!filteredAfericao.length) return 0;
    const soma = filteredAfericao.reduce((total, linha) => total + (linha.idade || 0), 0);
    return Math.round(soma / filteredAfericao.length);
  }, [filteredAfericao]);

  const contagemSexo = useMemo(() => {
    const contagem: Record<string, number> = { Menino: 0, Menina: 0 };
    filteredAfericao.forEach((linha) => {
      const label = normalizarSexo(linha.sexo);
      contagem[label] = (contagem[label] || 0) + 1;
    });
    return Object.entries(contagem).filter(([, quantidade]) => quantidade > 0);
  }, [filteredAfericao]);

  const contagemRacaCor = useMemo(() => {
    const contagem: Record<string, number> = {};
    filteredAfericao.forEach((linha) => {
      const label = normalizarRacaCor(linha.racaCor);
      contagem[label] = (contagem[label] || 0) + 1;
    });
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  }, [filteredAfericao]);

  const sexoChartOption = useMemo<IEDCChartOption>(
    () => ({
      tooltip: { ...TOOLTIP_STYLE, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 42, right: 16, top: 12, bottom: 28, containLabel: false },
      xAxis: {
        type: 'category',
        data: contagemSexo.map(([label]) => label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: AXIS_LABEL_DARK,
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
          data: contagemSexo.map(([label, quantidade]) => ({
            value: quantidade,
            itemStyle: {
              color: label === 'Menina' ? '#e85d8f' : label === 'Menino' ? '#2563eb' : '#9ca3af',
            },
          })),
          emphasis: {
            itemStyle: {
              color: undefined, // echarts will darken automatically
            },
          },
          itemStyle: { borderRadius: [8, 8, 0, 0] },
          barMaxWidth: 58,
          animationDuration: 850,
          animationEasing: 'quarticOut',
        },
      ],
    }),
    [contagemSexo],
  );

  const racaChartOption = useMemo<IEDCChartOption>(
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
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: '#29354a', fontSize: 12, fontWeight: 700 },
      },
      series: [
        {
          type: 'pie',
          radius: '80%',
          center: ['40%', '50%'],
          data: contagemRacaCor.map(([label, quantidade]) => ({
            name: label,
            value: quantidade,
            itemStyle: { color: CHART_COLORS_CRECHE_RACA[label] || '#4077cf' },
          })),
          label: { show: false },
          itemStyle: { borderWidth: 0 },
          emphasis: { scaleSize: 6 },
          animationDuration: 850,
          animationEasing: 'quarticOut',
        },
      ],
    }),
    [contagemRacaCor],
  );

  const exportRows = useMemo(
    () => filteredAfericao.map((linha) => ({
      Registro: linha.id,
      Nome: maskName(linha.nome, lgpdMode),
      Idade: `${linha.idade} anos`,
      Turma: linha.turma,
      Gênero: normalizarSexo(linha.sexo),
      'Raça/cor': normalizarRacaCor(linha.racaCor),
      CPF: maskDocument(linha.cpf, lgpdMode),
      NIS: maskDocument(linha.nis, lgpdMode, 4, 2),
      Ingresso: formatDate(linha.dataIngresso),
      Responsável: linha.responsavel || '-',
      Telefone: maskDocument(linha.telefone, lgpdMode, 2, 2),
    })),
    [filteredAfericao, lgpdMode],
  );

  const applyFilter = (tipo: 'genero' | 'racaCor', valor: string) => {
    setDrillDown((current) => (
      current?.tipo === tipo && current.valor === valor ? null : { tipo, valor }
    ));
  };

  const handleSexoClick = useCallback(
    (params: { dataIndex: number; name: string }) => {
      const label = contagemSexo[params.dataIndex]?.[0];
      if (label) applyFilter('genero', label);
    },
    [contagemSexo, drillDown],
  );

  const handleRacaClick = useCallback(
    (params: { dataIndex: number; name: string }) => {
      const label = contagemRacaCor[params.dataIndex]?.[0];
      if (label) applyFilter('racaCor', label);
    },
    [contagemRacaCor, drillDown],
  );

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(14);
    doc.text('Relatório da E.E.I. - Instrumento de Aferição', 14, 15);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} | Registros: ${filteredAfericao.length}`, 14, 22);
    if (drillDown) {
      const filtroLabel = drillDown.tipo === 'genero' ? 'Gênero' : 'Raça/cor';
      doc.text(`Filtro aplicado: ${filtroLabel} = ${drillDown.valor}`, 14, 28);
    }
    if (lgpdMode) {
      doc.text('Dados exportados em modo LGPD.', 14, drillDown ? 34 : 28);
    }

    autoTable(doc, {
      head: [['Nome', 'Idade', 'Turma', 'Gênero', 'Raça/cor', 'CPF', 'NIS', 'Ingresso', 'Responsável']],
      body: exportRows.map((row) => [
        row.Nome,
        row.Idade,
        row.Turma,
        row.Gênero,
        row['Raça/cor'],
        row.CPF,
        row.NIS,
        row.Ingresso,
        row.Responsável,
      ]),
      startY: lgpdMode ? (drillDown ? 40 : 34) : (drillDown ? 34 : 28),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 65, 170] },
    });

    doc.save('relatorio-eei-afericao.pdf');
  };

  const downloadExcel = () => {
    downloadExcelCompatibleTable(exportRows, 'relatorio-eei-afericao.xls', 'Afericao');
  };

  return (
    <main className="page-band creche-reports-page">
      <PageHeader
        className="creche-reports-head"
        eyebrow="E.E.I. Casa do Pequenino"
        title="Relatórios da E.E.I."
        description="Área técnica para gerar aferição, frequência e prestação de contas da E.E.I., seguindo a mesma lógica operacional dos relatórios do albergue."
        actions={(
          <div className="report-actions">
          <a href="#previa-afericao">Ver prévia</a>
          {drillDown && (
            <button className="report-button secondary" onClick={() => setDrillDown(null)} type="button">
              Limpar: {drillDown.valor}
            </button>
          )}
          <button className="report-button" onClick={downloadPDF} type="button">
            PDF
          </button>
          <button className="report-button secondary" onClick={downloadExcel} type="button">
            Excel
          </button>
          <button
            aria-pressed={lgpdMode}
            className={`report-button ${lgpdMode ? '' : 'secondary'}`}
            onClick={() => setLgpdMode((value) => !value)}
            type="button"
          >
            {lgpdMode ? 'LGPD ativo' : 'Modo LGPD'}
          </button>
          </div>
        )}
      />

      <MetricGrid>
        <MetricCard label="Total de crianças" value={afericao.length} detail={`${turmas || 0} turmas disponíveis para conferência`} />
        <MetricCard label="Seleção atual" value={filteredAfericao.length} detail={drillDown ? `Filtrado por ${drillDown.valor}` : `${responsaveis} responsáveis na seleção`} />
        <MetricCard label="Média de idade" value={mediaIdade} detail="Anos na seleção atual" />
        <MetricCard label="Pendências NIS" value={pendencias} detail="Documentos a completar" tone="warning" />
      </MetricGrid>

      <section className="report-analytics-grid">
        <article className="report-card">
          <div className="report-chart-title">
            <h2 className="section-title">Gênero</h2>
            <span>Clique nas barras para filtrar</span>
          </div>
          <div className="report-chart-box">
            {contagemSexo.length > 0 ? (
              <EChartCanvas
                ariaLabel="Gráfico por gênero da E.E.I."
                option={sexoChartOption}
                onDataClick={handleSexoClick}
              />
            ) : (
              <div className="executive-empty-chart executive-empty-chart-compact">
                {loading ? 'Carregando dados...' : 'Sem dados de sexo'}
              </div>
            )}
          </div>
        </article>

        <article className="report-card">
          <div className="report-chart-title">
            <h2 className="section-title">Raça/cor</h2>
            <span>Clique nas fatias para filtrar</span>
          </div>
          <div className="report-chart-box">
            {contagemRacaCor.length > 0 ? (
              <EChartCanvas
                ariaLabel="Gráfico por raça/cor da E.E.I."
                option={racaChartOption}
                onDataClick={handleRacaClick}
              />
            ) : (
              <div className="executive-empty-chart executive-empty-chart-compact">
                {loading ? 'Carregando dados...' : 'Sem dados de raça/cor'}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="section-grid">
        <article className="report-card">
          <h2 className="section-title">Modelos disponíveis</h2>
          <div className="service-list">
            {relatorios.map((relatorio) => (
              <div className="service-link report-option" key={relatorio.nome}>
                <div>
                  <strong>{relatorio.nome}</strong>
                  <span>{relatorio.descricao}</span>
                </div>
                <span className="service-pill">{relatorio.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="work-card">
          <h2 className="section-title">Campos obrigatórios conhecidos</h2>
          <p>
            A base de aferição fica ligada à criança e aos responsáveis, mantendo separação
            da operação do albergue.
          </p>
          <ul className="work-list">
            {camposAfericao.map((campo) => (
              <li key={campo}>
                <strong>{campo}</strong>
                <span>Aferição</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="report-card" id="previa-afericao">
        <div className="report-header-row">
          <div>
            <h2 className="section-title">Prévia da aferição</h2>
            <p>
              Base local gerada a partir dos cadastros da E.E.I., com criança, documentos,
              NIS, turma, data de ingresso, responsável principal e telefone.
            </p>
          </div>
          <div className="report-actions">
            <button className="report-button" onClick={downloadPDF} type="button">
              Exportar PDF
            </button>
            <button className="report-button secondary" onClick={downloadExcel} type="button">
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="report-table-wrap ds-table-shell">
          <table className="report-table">
            <thead>
              <tr>
                <th>Registro</th>
                <th>Nome</th>
                <th>Idade</th>
                <th>Turma</th>
                <th>Gênero</th>
                <th>Raça/cor</th>
                <th>CPF</th>
                <th>NIS</th>
                <th>Ingresso</th>
                <th>Responsável</th>
                <th>Telefone</th>
              </tr>
            </thead>
            <tbody>
              {filteredAfericao.map((linha) => (
                <tr key={linha.id}>
                  <td>{linha.id}</td>
                  <td>{maskName(linha.nome, lgpdMode)}</td>
                  <td>{linha.idade} anos</td>
                  <td>{linha.turma}</td>
                  <td>{normalizarSexo(linha.sexo)}</td>
                  <td>{normalizarRacaCor(linha.racaCor)}</td>
                  <td>{maskDocument(linha.cpf, lgpdMode)}</td>
                  <td>{maskDocument(linha.nis, lgpdMode, 4, 2)}</td>
                  <td>{formatDate(linha.dataIngresso)}</td>
                  <td>{linha.responsavel || '-'}</td>
                  <td>{maskDocument(linha.telefone, lgpdMode, 2, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="institutional-note">Carregando prévia da aferição...</p>}
          {error && <p className="institutional-note">Não foi possível carregar a aferição da E.E.I.</p>}
          {!loading && !filteredAfericao.length && (
            <p className="institutional-note">Nenhum registro encontrado para o filtro atual.</p>
          )}
        </div>
      </section>

      <section className="report-card">
        <div className="report-header-row">
          <div>
            <h2 className="section-title">Entrega para a gestão</h2>
            <p>
              A coordenação gera e confere os relatórios do serviço aqui. A gestão recebe os
              totais consolidados no painel institucional, podendo analisar albergue e E.E.I.
              juntos ou separadamente.
            </p>
          </div>
          <div className="report-actions">
            <Link to="/creche">Dashboard da E.E.I.</Link>
            <Link to="/gestao">Painel da gestão</Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default CrecheReportsPage;
