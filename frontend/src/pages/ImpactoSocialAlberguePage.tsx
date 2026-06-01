import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveRadar } from '@nivo/radar';
import {
  createImpactoAlbergueResposta,
  useImpactoSocialAlbergue,
  type CreateImpactoAlberguePayload,
  type ImpactoSocialCount,
  type ImpactoSocialPeriodo,
} from '../api';
import { useAuth } from '../context/AuthContext';
import '../styles/institutional.css';

const periodos: { label: string; value: ImpactoSocialPeriodo }[] = [
  { label: 'Mês', value: 'mes' },
  { label: 'Trimestre', value: 'trimestre' },
  { label: 'Ano', value: 'ano' },
  { label: 'Tudo', value: 'todos' },
];

const situacaoTerritorialOptions = [
  'Situação de rua',
  'Pessoa em trânsito',
  'Migrante',
  'Migrante em situação de rua',
  'Imigrante',
  'Imigrante em situação de rua',
  'Ñ informado',
  'Prefiro ñ responder',
];

const tempoSemMoradiaOptions = [
  'Menos de 7 dias',
  'Entre 1 semana e 1 mês',
  'Entre 1 e 6 meses',
  'Entre 6 meses e 1 ano',
  'Entre 1 e 3 anos',
  'Mais de 3 anos',
  'Mais de 10 anos',
  'Vivo essa situação de forma intermitente, com idas e vindas',
  'Prefiro não responder',
];

const fatoresOptions = [
  'Perda de trabalho ou renda',
  'Dificuldade para pagar aluguel ou moradia',
  'Rompimento ou conflito familiar',
  'Separação conjugal',
  'Violência doméstica ou familiar',
  'Problemas de saúde',
  'Sofrimento psíquico ou saúde mental',
  'Uso problemático de álcool ou outras substâncias',
  'Migração ou chegada recente à cidade sem rede de apoio',
  'Saída de hospital, abrigo, prisão ou outra instituição',
  'Perda de documentos',
  'Enchente, desastre ou perda da moradia',
  'Escolha não falar sobre isso agora',
  'Outro',
];

const ajudaOptions = [
  'Proteção/pernoite',
  'Descanso/segurança',
  'Alimentação',
  'Higiene/vestuário',
  'Escuta/vínculo',
  'Orientação',
  'Possibilidade de refletir',
  'Oficina/atividade',
  'Outro',
];

const proximoPassoOptions = [
  'Saúde',
  'Documentação',
  'Benefício/CadÚnico',
  'Trabalho/renda',
  'Família/rede de apoio',
  'Moradia/acolhimento',
  'Proteção/segurança',
  'Educação',
  'Nenhum agora',
  'Outro',
];

const demandasEquipeOptions = [
  'Saúde',
  'Saúde mental',
  'Documentação',
  'Benefícios/CadÚnico',
  'Trabalho/renda',
  'Moradia/acolhimento',
  'Família/rede de apoio',
  'Segurança/proteção',
  'Higiene/vestuário',
  'Escuta/vínculo',
  'Violência',
  'Uso problemático de álcool/outras substâncias',
  'Migração/trânsito',
  'Jurídico/Defensoria',
  'Educação',
  'Oficina/atividade',
  'Apenas proteção/pernoite imediato',
  'Outro',
];

const acaoEquipeOptions = [
  'Escuta',
  'Orientação',
  'Encaminhamento sugerido',
  'Encaminhamento aceito',
  'Retorno/acompanhamento necessário',
  'Apenas acolhimento imediato',
];

const respostaOptions = ['Sim', 'Em parte', 'Não', 'Prefiro não responder'];
const comunicacaoOptions = ['Sim', 'Em parte', 'Não', 'Não se aplica'];
const proximoPassoAjudaOptions = ['Sim', 'Em parte', 'Não', 'Ainda não'];
const oficinaOptions = ['Sim', 'Não', 'Ainda não, mas tenho interesse', 'Não tenho interesse no momento'];

const impactNivoTheme = {
  text: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: 12,
    fill: '#526178',
  },
  tooltip: {
    container: {
      background: '#172033',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '14px',
      boxShadow: '0 14px 34px rgba(9, 18, 32, 0.24)',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: 800,
      padding: '10px 12px',
    },
  },
  axis: {
    ticks: {
      text: {
        fill: '#526178',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: 11,
        fontWeight: 800,
      },
      line: {
        stroke: 'rgba(104, 119, 142, 0.18)',
      },
    },
  },
  grid: {
    line: {
      stroke: 'rgba(104, 119, 142, 0.12)',
      strokeWidth: 1,
    },
  },
  legends: {
    text: {
      fill: '#526178',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: 11,
      fontWeight: 850,
    },
  },
};

const initialForm: CreateImpactoAlberguePayload = {
  dataReferencia: new Date().toISOString().slice(0, 10),
  situacaoTerritorial: 'Situação de rua',
  tempoSemMoradia: 'Prefiro não responder',
  fatoresSemMoradia: [],
  fatoresSemMoradiaOutro: '',
  ajudaPrincipal: [],
  ajudaPrincipalOutro: '',
  respeitoUsuarios: 'Prefiro não responder',
  comunicacaoEquipe: 'Não se aplica',
  proximoPassoAjuda: 'Ainda não',
  proximosPassos: [],
  proximoPassoOutro: '',
  participouOficina: 'Não',
  relatoRepresenta: '',
  melhoriaSugerida: '',
  demandasEquipe: [],
  demandaOutro: '',
  acaoEquipe: [],
  preenchidoPor: '',
  perfilPreenchedor: '',
};

function toggleArray(value: string, list: string[]) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

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

function topItems(items: ImpactoSocialCount[], limit = 6) {
  return [...items].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)).slice(0, limit);
}

function completeDistribution(items: ImpactoSocialCount[], order: string[]) {
  const map = new Map(items.map((item) => [item.label, item.total]));
  const position = new Map(order.map((label, index) => [label, index]));
  const ordered = order.map((label) => ({ label, total: map.get(label) ?? 0 }));
  const extra = items
    .filter((item) => !order.includes(item.label))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  return [...ordered, ...extra].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;

    const positionA = position.get(a.label) ?? Number.MAX_SAFE_INTEGER;
    const positionB = position.get(b.label) ?? Number.MAX_SAFE_INTEGER;

    return positionA - positionB || a.label.localeCompare(b.label);
  });
}

function completeChartSizeClass(items: ImpactoSocialCount[]) {
  if (items.length >= 10) return 'bars-xl';
  if (items.length >= 8) return 'bars-lg';
  return 'bars-md';
}

function compactChartLabel(label: string, maxLength = 42) {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1).trim()}...`;
}

function compactRadarLabel(label: string) {
  const map: Record<string, string> = {
    'Próximos passos': 'Próximos\npassos',
    Atividades: 'Oficinas',
    Descanso: 'Descanso',
    Comunicação: 'Comunicação',
    Proteção: 'Proteção',
    Vínculo: 'Vínculo',
  };

  return map[label] ?? compactChartLabel(label, 14);
}

function ImpactTooltip({
  label,
  value,
  suffix = 'registros',
}: {
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="impact-chart-tooltip">
      <strong>{label}</strong>
      <span>{value} {suffix}</span>
    </div>
  );
}

function ImpactRadarGridLabel({
  anchor,
  id,
  x,
  y,
}: {
  anchor: 'start' | 'middle' | 'end';
  id: string;
  x: number;
  y: number;
}) {
  const lines = id.split('\n');

  return (
    <g transform={`translate(${x}, ${y})`}>
      <text
        dominantBaseline="central"
        fill="#526178"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontSize={11}
        fontWeight={850}
        textAnchor={anchor}
      >
        {lines.map((line, index) => (
          <tspan
            dy={lines.length === 1 ? 0 : index === 0 ? -7 : 14}
            key={line}
            x={0}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function FormSection({
  children,
  description,
  number,
  title,
}: {
  children: ReactNode;
  description: string;
  number: string;
  title: string;
}) {
  return (
    <section className="impact-form-section">
      <div className="impact-form-section-title">
        <span>{number}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function QuestionField({
  children,
  number,
  title,
  wide = false,
}: {
  children: ReactNode;
  number: string;
  title: string;
  wide?: boolean;
}) {
  return (
    <label className={`impact-question-card${wide ? ' wide' : ''}`}>
      <span className="impact-question-label"><em>{number}</em>{title}</span>
      {children}
    </label>
  );
}

function QuestionFieldset({
  children,
  description,
  number,
  title,
}: {
  children: ReactNode;
  description?: string;
  number: string;
  title: string;
}) {
  return (
    <fieldset className="impact-question-fieldset">
      <legend>
        <span>{number}</span>
        <strong>{title}</strong>
        {description ? <em>{description}</em> : null}
      </legend>
      {children}
    </fieldset>
  );
}

function PremiumImpactLine({
  points,
}: {
  points: { data: string; respostas: number }[];
}) {
  const chartData = [
    {
      id: 'Escutas',
      data: points.map((point) => {
        const date = new Date(`${point.data}T12:00:00`);
        return {
          x: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          y: point.respostas,
        };
      }),
    },
  ];

  return (
    <ResponsiveLine
      axisBottom={{
        tickPadding: 10,
        tickRotation: 0,
        tickSize: 0,
      }}
      axisLeft={{
        tickPadding: 10,
        tickSize: 0,
        tickValues: 4,
      }}
      areaOpacity={0.16}
      colors={['#0041aa']}
      curve="monotoneX"
      data={chartData}
      enableArea
      enableGridX={false}
      enablePoints
      lineWidth={4}
      margin={{ top: 18, right: 28, bottom: 44, left: 46 }}
      motionConfig="gentle"
      pointBorderColor="#0041aa"
      pointBorderWidth={3}
      pointColor="#ffffff"
      pointSize={10}
      theme={impactNivoTheme}
      tooltip={({ point }) => (
        <ImpactTooltip label={`${point.seriesId} em ${point.data.xFormatted}`} value={point.data.yFormatted} />
      )}
      useMesh
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 0, stacked: false }}
    />
  );
}

function PremiumCompleteDistribution({
  color,
  items,
  unit = 'respostas',
}: {
  color: string;
  items: ImpactoSocialCount[];
  unit?: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.total), 1);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="impact-complete-bars">
      {items.map((item, index) => {
        const width = item.total > 0 ? `${Math.max(4, (item.total / maxValue) * 100)}%` : '0%';
        const share = total > 0 ? Math.round((item.total / total) * 100) : 0;
        const style = {
          '--bar-color': color,
          '--bar-delay': `${index * 42}ms`,
          '--bar-width': width,
        } as CSSProperties;

        return (
          <div className={`impact-complete-bar ${item.total === 0 ? 'is-zero' : ''}`} key={item.label} style={style}>
            <div className="impact-complete-bar-row">
              <span>{item.label}</span>
              <strong>
                {item.total}
                <small>{total > 0 ? ` ${share}%` : ` ${unit}`}</small>
              </strong>
            </div>
            <div className="impact-complete-track" aria-label={`${item.label}: ${item.total} ${unit}`}>
              <i />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PremiumImpactRadar({
  items,
}: {
  items: { label: string; valor: number }[];
}) {
  const chartData = items.map((item) => ({
    dimensao: compactRadarLabel(item.label),
    valor: item.valor,
  }));

  return (
    <ResponsiveRadar
      blendMode="multiply"
      borderWidth={3}
      colors={['#0041aa']}
      curve="linearClosed"
      data={chartData}
      dotBorderColor="#ffffff"
      dotBorderWidth={2}
      dotColor="#f6a623"
      dotSize={8}
      fillOpacity={0.24}
      gridLabel={ImpactRadarGridLabel}
      gridLabelOffset={16}
      indexBy="dimensao"
      keys={['valor']}
      margin={{ top: 42, right: 72, bottom: 42, left: 72 }}
      maxValue={100}
      motionConfig="gentle"
      theme={impactNivoTheme}
      valueFormat={(value) => `${value}%`}
    />
  );
}

const ImpactoSocialAlberguePage = () => {
  const { currentUser } = useAuth();
  const [periodo, setPeriodo] = useState<ImpactoSocialPeriodo>('mes');
  const [reload, setReload] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateImpactoAlberguePayload>(initialForm);
  const { data, loading, error } = useImpactoSocialAlbergue(periodo, reload);

  const demandas = topItems(data?.distribuicoes.demandasEquipe ?? [], 8);
  const fatores = completeDistribution(data?.distribuicoes.fatoresSemMoradia ?? [], fatoresOptions);
  const proximosPassos = completeDistribution(data?.distribuicoes.proximosPassos ?? [], proximoPassoOptions);
  const ajudaPrincipal = topItems(data?.distribuicoes.ajudaPrincipal ?? [], 8);
  const tempoSemMoradia = completeDistribution(data?.distribuicoes.tempoSemMoradia ?? [], tempoSemMoradiaOptions);
  const situacaoTerritorial = completeDistribution(
    data?.distribuicoes.situacaoTerritorial ?? [],
    situacaoTerritorialOptions,
  );
  const periodoTexto = formatPeriodo(data?.periodo.inicio, data?.periodo.fim);

  const updateForm = <K extends keyof CreateImpactoAlberguePayload>(
    key: K,
    value: CreateImpactoAlberguePayload[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      await createImpactoAlbergueResposta({
        ...form,
        preenchidoPor: currentUser?.displayName || form.preenchidoPor,
        perfilPreenchedor: currentUser?.roleLabel || form.perfilPreenchedor,
      });
      setForm({ ...initialForm, dataReferencia: new Date().toISOString().slice(0, 10) });
      setModalOpen(false);
      setReload((value) => value + 1);
      window.showToast?.('Formulário de impacto registrado.', 'success');
    } catch (err) {
      window.showToast?.(err instanceof Error ? err.message : 'Erro ao salvar formulário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-band impact-page">
      <section className="impact-hero">
        <div>
          <p className="institutional-eyebrow">Albergue Noturno</p>
          <h1>Impacto Social do Albergue</h1>
          <p>
            Leitura anônima da experiência de acolhimento, demandas sociais,
            próximos passos e relatos qualitativos do serviço.
          </p>
        </div>
        <button className="impact-primary-action" onClick={() => setModalOpen(true)} type="button">
          Formulário de impacto
        </button>
      </section>

      <section className="impact-toolbar">
        <div>
          <strong>{periodoTexto}</strong>
          <span>Banco anônimo separado da base de pessoas e estadias</span>
        </div>
        <div className="impact-period-tabs" aria-label="Período do impacto social">
          {periodos.map((option) => (
            <button
              className={periodo === option.value ? 'active' : ''}
              key={option.value}
              onClick={() => setPeriodo(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="impact-kpis">
        <article>
          <span>Formulários</span>
          <strong>{data?.kpis.totalRespostas ?? 0}</strong>
          <small>Respostas anônimas no período</small>
        </article>
        <article>
          <span>Proteção/pernoite</span>
          <strong>{data?.kpis.protecaoPernoitePercentual ?? 0}%</strong>
          <small>{data?.kpis.protecaoPernoite ?? 0} respostas</small>
        </article>
        <article>
          <span>Respeito entre usuários</span>
          <strong>{data?.kpis.respeitoUsuariosPercentual ?? 0}%</strong>
          <small>{data?.kpis.respeitoUsuarios ?? 0} respostas positivas</small>
        </article>
        <article>
          <span>Próximos passos</span>
          <strong>{data?.kpis.proximoPassoPercentual ?? 0}%</strong>
          <small>{data?.kpis.proximoPasso ?? 0} disseram que ajuda</small>
        </article>
      </section>

      <section className="impact-chart-grid">
        <article className="impact-panel impact-panel-large">
          <div className="impact-panel-head">
            <div>
              <h2>Evolução das escutas</h2>
              <span>Formulários respondidos por mês</span>
            </div>
          </div>
          <div className="impact-chart-canvas">
            {(data?.serieMensal.length ?? 0) > 0 ? (
              <PremiumImpactLine points={data?.serieMensal ?? []} />
            ) : (
              <div className="impact-empty">Sem respostas no período</div>
            )}
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Dimensões de impacto</h2>
              <span>Proteção, vínculo, orientação e autonomia</span>
            </div>
          </div>
          <div className="impact-chart-canvas compact">
            <PremiumImpactRadar items={data?.radar ?? []} />
          </div>
        </article>
      </section>

      <section className="impact-chart-grid">
        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Fatores de vulnerabilidade</h2>
              <span>O que contribuiu para a ausência de moradia estável</span>
            </div>
          </div>
          <div className={`impact-chart-canvas full-bars ${completeChartSizeClass(fatores)}`}>
            <PremiumCompleteDistribution color="#0041aa" items={fatores} />
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Próximos passos desejados</h2>
              <span>Horizontes apontados após o atendimento</span>
            </div>
          </div>
          <div className={`impact-chart-canvas full-bars ${completeChartSizeClass(proximosPassos)}`}>
            <PremiumCompleteDistribution color="#2d6fd2" items={proximosPassos} />
          </div>
        </article>
      </section>

      <section className="impact-chart-grid impact-chart-grid-balanced">
        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Tempo sem moradia estável</h2>
              <span>Recorte do tempo informado em situação de rua ou instabilidade habitacional</span>
            </div>
          </div>
          <div className={`impact-chart-canvas full-bars ${completeChartSizeClass(tempoSemMoradia)}`}>
            <PremiumCompleteDistribution color="#18a058" items={tempoSemMoradia} />
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Público por situação territorial</h2>
              <span>Situação de rua, trânsito, migração e demais perfis informados</span>
            </div>
          </div>
          <div className={`impact-chart-canvas full-bars ${completeChartSizeClass(situacaoTerritorial)}`}>
            <PremiumCompleteDistribution color="#f6a623" items={situacaoTerritorial} unit="perfis" />
          </div>
        </article>
      </section>

      <section className="impact-bottom-grid">
        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Demandas identificadas pela equipe</h2>
              <span>Leitura técnica ao final do formulário</span>
            </div>
          </div>
          <div className="impact-ranking">
            {demandas.map((item, index) => (
              <div key={item.label}>
                <span>{index + 1}</span>
                <p>{item.label}</p>
                <strong>{item.total}</strong>
              </div>
            ))}
            {!demandas.length && <p className="institutional-note">Sem demandas registradas no período.</p>}
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>O que o Albergue representa</h2>
              <span>Frases curtas anônimas</span>
            </div>
          </div>
          <div className="impact-voice-list">
            {(data?.relatos ?? []).map((item) => (
              <blockquote key={item.id}>{item.texto}</blockquote>
            ))}
            {!data?.relatos?.length && <p className="institutional-note">Sem relatos no período.</p>}
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Pontos de melhoria</h2>
              <span>Sugestões recorrentes para qualificar o serviço</span>
            </div>
          </div>
          <div className="impact-voice-list improvements">
            {(data?.melhorias ?? []).map((item) => (
              <blockquote key={item.id}>{item.texto}</blockquote>
            ))}
            {!data?.melhorias?.length && <p className="institutional-note">Sem sugestões no período.</p>}
          </div>
        </article>
      </section>

      <section className="impact-tags-grid">
        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>Palavras mais presentes</h2>
              <span>Extraídas das frases curtas</span>
            </div>
          </div>
          <div className="impact-tags">
            {(data?.palavrasRelatos ?? []).map((item) => (
              <span key={item.label}>{item.label}<em>{item.total}</em></span>
            ))}
            {!data?.palavrasRelatos?.length && <p className="institutional-note">Sem volume textual suficiente.</p>}
          </div>
        </article>

        <article className="impact-panel">
          <div className="impact-panel-head">
            <div>
              <h2>O acesso ajuda em quê</h2>
              <span>Principais efeitos percebidos no dia</span>
            </div>
          </div>
          <div className="impact-tags strong">
            {ajudaPrincipal.map((item) => (
              <span key={item.label}>{item.label}<em>{item.total}</em></span>
            ))}
            {!ajudaPrincipal.length && <p className="institutional-note">Sem respostas no período.</p>}
          </div>
        </article>
      </section>

      {loading && <p className="institutional-note">Atualizando módulo de impacto social...</p>}
      {error && <p className="institutional-note">Não foi possível carregar os dados de impacto.</p>}

      {modalOpen ? (
        <div className="impact-modal-backdrop" role="presentation">
          <form className="impact-modal" onSubmit={handleSubmit}>
            <header>
              <div>
                <span>Formulário anônimo</span>
                <h2>Formulário de impacto</h2>
                <p>As respostas não ficam vinculadas a pessoa, estadia, CPF ou NIS.</p>
                <div className="impact-modal-badges" aria-label="Características do formulário">
                  <strong>Anônimo</strong>
                  <strong>Banco separado</strong>
                  <strong>Uso institucional</strong>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} type="button">Fechar</button>
            </header>

            <FormSection
              description="Registre o período e a situação territorial sem identificar a pessoa atendida."
              number="01"
              title="Contexto do acesso"
            >
              <div className="impact-form-grid">
                <QuestionField number="1" title="Data de referência">
                  <input
                    onChange={(event) => updateForm('dataReferencia', event.target.value)}
                    required
                    type="date"
                    value={form.dataReferencia}
                  />
                </QuestionField>

                <QuestionField number="2" title="Situação territorial informada ou observada">
                  <select
                    onChange={(event) => updateForm('situacaoTerritorial', event.target.value)}
                    value={form.situacaoTerritorial}
                  >
                    {situacaoTerritorialOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </QuestionField>

                <QuestionField
                  number="3"
                  title="Há quanto tempo está em situação de rua ou sem moradia estável?"
                  wide
                >
                  <select
                    onChange={(event) => updateForm('tempoSemMoradia', event.target.value)}
                    value={form.tempoSemMoradia}
                  >
                    {tempoSemMoradiaOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </QuestionField>
              </div>

              <QuestionFieldset
                description="É possível escolher mais de uma alternativa."
                number="4"
                title="O que mais contribuiu para estar sem moradia estável?"
              >
                <div className="impact-check-grid">
                  {fatoresOptions.map((option) => (
                    <label key={option}>
                      <input
                        checked={form.fatoresSemMoradia.includes(option)}
                        onChange={() => updateForm('fatoresSemMoradia', toggleArray(option, form.fatoresSemMoradia))}
                        type="checkbox"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {form.fatoresSemMoradia.includes('Outro') ? (
                  <input
                    onChange={(event) => updateForm('fatoresSemMoradiaOutro', event.target.value)}
                    placeholder="Descreva o outro fator"
                    value={form.fatoresSemMoradiaOutro}
                  />
                ) : null}
              </QuestionFieldset>
            </FormSection>

            <FormSection
              description="Perguntas rápidas sobre a experiência no serviço e os efeitos percebidos no dia."
              number="02"
              title="Experiência no acolhimento"
            >
              <QuestionFieldset
                description="Marque tudo que fizer sentido para a resposta."
                number="5"
                title="Acessar o albergue hoje ajuda principalmente em quê?"
              >
                <div className="impact-check-grid">
                  {ajudaOptions.map((option) => (
                    <label key={option}>
                      <input
                        checked={form.ajudaPrincipal.includes(option)}
                        onChange={() => updateForm('ajudaPrincipal', toggleArray(option, form.ajudaPrincipal))}
                        type="checkbox"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {form.ajudaPrincipal.includes('Outro') ? (
                  <input
                    onChange={(event) => updateForm('ajudaPrincipalOutro', event.target.value)}
                    placeholder="Descreva outro efeito percebido"
                    value={form.ajudaPrincipalOutro}
                  />
                ) : null}
              </QuestionFieldset>

              <div className="impact-form-grid">
                <QuestionField number="6" title="Sentiu-se respeitado por outros usuários?">
                  <select
                    onChange={(event) => updateForm('respeitoUsuarios', event.target.value)}
                    value={form.respeitoUsuarios}
                  >
                    {respostaOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </QuestionField>

                <QuestionField number="7" title="A comunicação/orientação da equipe é clara?">
                  <select
                    onChange={(event) => updateForm('comunicacaoEquipe', event.target.value)}
                    value={form.comunicacaoEquipe}
                  >
                    {comunicacaoOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </QuestionField>

                <QuestionField number="8" title="O atendimento ajuda a pensar em próximo passo?">
                  <select
                    onChange={(event) => updateForm('proximoPassoAjuda', event.target.value)}
                    value={form.proximoPassoAjuda}
                  >
                    {proximoPassoAjudaOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </QuestionField>

                <QuestionField number="9" title="Já participou de oficina/atividade?">
                  <select
                    onChange={(event) => updateForm('participouOficina', event.target.value)}
                    value={form.participouOficina}
                  >
                    {oficinaOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </QuestionField>
              </div>
            </FormSection>

            <FormSection
              description="Identifique quais caminhos a pessoa gostaria de buscar a partir do atendimento."
              number="03"
              title="Próximos passos"
            >
              <QuestionFieldset
                description="Use esta pergunta quando houver abertura para falar sobre possibilidades."
                number="10"
                title="Se sim, quais próximos passos gostaria de buscar agora?"
              >
                <div className="impact-check-grid">
                  {proximoPassoOptions.map((option) => (
                    <label key={option}>
                      <input
                        checked={form.proximosPassos.includes(option)}
                        onChange={() => updateForm('proximosPassos', toggleArray(option, form.proximosPassos))}
                        type="checkbox"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {form.proximosPassos.includes('Outro') ? (
                  <input
                    onChange={(event) => updateForm('proximoPassoOutro', event.target.value)}
                    placeholder="Descreva outro próximo passo"
                    value={form.proximoPassoOutro}
                  />
                ) : null}
              </QuestionFieldset>
            </FormSection>

            <FormSection
              description="Campo qualitativo para transformar escutas em evidência institucional."
              number="04"
              title="Relato e melhoria"
            >
              <div className="impact-form-grid">
                <QuestionField
                  number="11"
                  title="Em uma palavra ou frase curta, o que o Albergue representa neste momento?"
                  wide
                >
                  <textarea
                    onChange={(event) => updateForm('relatoRepresenta', event.target.value)}
                    placeholder="Ex.: segurança, descanso, recomeço..."
                    value={form.relatoRepresenta}
                  />
                </QuestionField>

                <QuestionField number="12" title="Há algo que poderia melhorar?" wide>
                  <textarea
                    onChange={(event) => updateForm('melhoriaSugerida', event.target.value)}
                    placeholder="Registre uma sugestão curta, se houver."
                    value={form.melhoriaSugerida}
                  />
                </QuestionField>
              </div>
            </FormSection>

            <FormSection
              description="Registro técnico feito pelo educador ou pela equipe ao final da escuta."
              number="05"
              title="Leitura da equipe"
            >
              <QuestionFieldset
                description="Selecione todas as demandas percebidas durante a abordagem."
                number="13"
                title="Demanda identificada pela equipe"
              >
                <div className="impact-check-grid">
                  {demandasEquipeOptions.map((option) => (
                    <label key={option}>
                      <input
                        checked={form.demandasEquipe.includes(option)}
                        onChange={() => updateForm('demandasEquipe', toggleArray(option, form.demandasEquipe))}
                        type="checkbox"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </QuestionFieldset>

              <QuestionFieldset
                description="Registre a resposta concreta realizada ou pactuada pela equipe."
                number="14"
                title="Ação realizada pela equipe"
              >
                <div className="impact-check-grid">
                  {acaoEquipeOptions.map((option) => (
                    <label key={option}>
                      <input
                        checked={form.acaoEquipe.includes(option)}
                        onChange={() => updateForm('acaoEquipe', toggleArray(option, form.acaoEquipe))}
                        type="checkbox"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </QuestionFieldset>
            </FormSection>

            <footer>
              <button onClick={() => setModalOpen(false)} type="button">Cancelar</button>
              <button disabled={saving} type="submit">
                {saving ? 'Salvando...' : 'Salvar formulário'}
              </button>
            </footer>

          </form>
        </div>
      ) : null}
    </main>
  );
};

export default ImpactoSocialAlberguePage;
