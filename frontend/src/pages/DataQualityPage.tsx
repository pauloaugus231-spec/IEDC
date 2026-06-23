import { Link } from 'react-router-dom';
import {
  MetricCard,
  MetricGrid,
  PageHeader,
  Panel,
} from '../components/DesignSystem';
import {
  useQualidadeDados,
  type QualidadeAreaId,
  type QualidadeDadosItem,
  type QualidadeSeveridade,
} from '../api';
import '../styles/institutional.css';

const severityLabel: Record<QualidadeSeveridade, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  informativo: 'Informativo',
};

const areaTitle: Record<QualidadeAreaId | 'geral', string> = {
  geral: 'Qualidade de dados',
  albergue: 'Qualidade de dados do Albergue',
  creche: 'Qualidade de dados da E.E.I.',
  comercial: 'Qualidade de dados comercial',
};

const areaDescription: Record<QualidadeAreaId | 'geral', string> = {
  geral: 'Leitura institucional de cadastros, rotinas e pendências que afetam operação, relatórios e decisão.',
  albergue: 'Cadastros, presenças e estadias que precisam estar coerentes antes de virar relatório ou decisão.',
  creche: 'Crianças, responsáveis, turmas e frequência com pendências que prejudicam acompanhamento pedagógico.',
  comercial: 'Comandas, retiradas e produtos que precisam estar consistentes para fechamento comercial.',
};

function getScoreTone(score?: number) {
  if (score === undefined) return 'muted';
  if (score >= 85) return 'success';
  if (score >= 65) return 'warning';
  return 'danger';
}

function getItemTone(item: QualidadeDadosItem) {
  if (item.status === 'ok') return 'ok';
  return item.severity;
}

function formatGeneratedAt(value?: string) {
  if (!value) return 'Agora';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Agora';
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type DataQualityPageProps = {
  area?: QualidadeAreaId;
};

const DataQualityPage = ({ area }: DataQualityPageProps) => {
  const { data, loading, error } = useQualidadeDados(area);
  const titleKey = area ?? 'geral';

  return (
    <main className="page-band data-quality-page">
      <PageHeader
        className="data-quality-head"
        eyebrow="Governança operacional"
        title={areaTitle[titleKey]}
        description={areaDescription[titleKey]}
        actions={(
          <span className="data-quality-timestamp">
            Atualizado em {formatGeneratedAt(data?.generatedAt)}
          </span>
        )}
      />

      <MetricGrid className="data-quality-metrics">
        <MetricCard
          label="Maturidade"
          value={loading ? '...' : `${data?.summary.score ?? 0}%`}
          detail="Quanto menor a pendência, maior a confiança"
          tone={getScoreTone(data?.summary.score)}
        />
        <MetricCard
          label="Pendências"
          value={loading ? '...' : data?.summary.totalItems ?? 0}
          detail={`${data?.summary.affectedRecords ?? 0} registro(s) impactado(s)`}
          tone={(data?.summary.totalItems ?? 0) > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          label="Críticas"
          value={loading ? '...' : data?.summary.criticalItems ?? 0}
          detail="Afetam relatório, decisão ou segurança operacional"
          tone={(data?.summary.criticalItems ?? 0) > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          label="Áreas"
          value={loading ? '...' : data?.areas.length ?? 0}
          detail="Escopo visível para o seu perfil"
        />
      </MetricGrid>

      {error ? (
        <p className="commerce-alert">{error}</p>
      ) : null}

      <section className="data-quality-grid">
        {data?.areas.map((qualityArea) => (
          <Panel
            key={qualityArea.id}
            className={`data-quality-area data-quality-area-${qualityArea.summary.status}`}
            title={qualityArea.label}
            subtitle={qualityArea.description}
            actions={(
              <span className={`data-quality-area-status ${qualityArea.summary.status}`}>
                {qualityArea.summary.status === 'ok' ? 'Em ordem' : `${qualityArea.summary.total} pendência(s)`}
              </span>
            )}
          >
            <div className="data-quality-items">
              {qualityArea.items.map((item) => (
                <article className={`data-quality-item ${getItemTone(item)}`} key={item.id}>
                  <div className="data-quality-item-main">
                    <div>
                      <span className={`data-quality-pill ${getItemTone(item)}`}>
                        {item.status === 'ok' ? 'Em ordem' : severityLabel[item.severity]}
                      </span>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    <strong>{item.total}</strong>
                  </div>

                  {item.samples.length ? (
                    <div className="data-quality-samples">
                      {item.samples.map((sample) => (
                        <Link key={sample.id} to={sample.path || item.actionPath}>
                          <strong>{sample.label}</strong>
                          {sample.detail ? <span>{sample.detail}</span> : null}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="data-quality-ok-note">Nenhuma pendência encontrada neste critério.</p>
                  )}

                  <Link className="data-quality-action" to={item.actionPath}>
                    {item.actionLabel}
                  </Link>
                </article>
              ))}
            </div>
          </Panel>
        ))}

        {loading ? (
          <Panel className="data-quality-loading">
            <p className="institutional-note">Conferindo consistência dos dados...</p>
          </Panel>
        ) : null}
      </section>
    </main>
  );
};

export default DataQualityPage;
