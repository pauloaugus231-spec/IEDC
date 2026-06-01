import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getSystemHealthStatus,
  listObservabilityEvents,
  type ComponentHealthStatus,
  type ObservabilityEventEntry,
  type ObservabilityEventsResponse,
  type SystemHealthStatus,
} from '../api';
import { MetricCard, MetricGrid, PageHeader, Panel, TableShell } from '../components/DesignSystem';
import '../styles/institutional.css';
import '../styles/design-system.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(value: string | null | undefined) {
  if (!value) return 'Sem registro';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sem registro' : dateFormatter.format(date);
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) return 'Sem duração';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}min ${rest}s` : `${minutes}min`;
}

function formatBytes(value: number | null | undefined) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex ? 1 : 0)} ${units[unitIndex]}`;
}

function statusLabel(status: ComponentHealthStatus) {
  const labels: Record<ComponentHealthStatus, string> = {
    ok: 'Operacional',
    warning: 'Atenção',
    down: 'Indisponível',
    unknown: 'Sem leitura',
  };

  return labels[status];
}

function statusTone(status: ComponentHealthStatus): 'success' | 'warning' | 'danger' | 'muted' {
  if (status === 'ok') return 'success';
  if (status === 'down') return 'danger';
  if (status === 'unknown') return 'muted';
  return 'warning';
}

function badgeClass(status: ComponentHealthStatus | string) {
  if (status === 'ok' || status === 'info') return 'ok';
  if (status === 'warning' || status === 'aviso' || status === 'unknown') return 'warning';
  if (status === 'down' || status === 'erro') return 'danger';
  return 'muted';
}

function humanize(value: string | null | undefined) {
  if (!value) return 'Sistema';
  return value
    .replace(/[_:.]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function metadataPreview(entry: ObservabilityEventEntry) {
  if (!entry.metadata || !Object.keys(entry.metadata).length) {
    return 'Sem metadados.';
  }

  return Object.entries(entry.metadata)
    .slice(0, 2)
    .map(([key, value]) => `${humanize(key)}: ${typeof value === 'string' ? value.slice(0, 80) : JSON.stringify(value).slice(0, 80)}`)
    .join(' · ');
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const SupportSystemHealthPage = () => {
  const [status, setStatus] = useState<SystemHealthStatus | null>(null);
  const [eventsResponse, setEventsResponse] = useState<ObservabilityEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [systemStatus, events] = await Promise.all([
        getSystemHealthStatus(),
        listObservabilityEvents({ limit: 20, horas: 24 }),
      ]);
      setStatus(systemStatus);
      setEventsResponse(events);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível carregar a saúde do sistema.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const events = eventsResponse?.data ?? [];
  const dependencies = useMemo(() => {
    if (!status) return [];

    return [
      { label: 'Banco de dados', detail: 'Persistência principal', component: status.dependencies.database },
      { label: 'Redis', detail: 'Cache e prontidão técnica', component: status.dependencies.redis },
      { label: 'Uploads', detail: 'Anexos e fotos operacionais', component: status.dependencies.uploads },
      { label: 'Backup', detail: 'Última rotina registrada', component: status.backup },
    ];
  }, [status]);

  return (
    <main className="page-band support-page system-health-page ds-admin-surface">
      <PageHeader
        eyebrow="Suporte institucional"
        title="Saúde do sistema"
        description="Monitore API, banco, uploads, backup e erros recentes com leitura técnica suficiente para agir antes que a operação reclame."
        actions={(
          <button className="creche-head-link ds-button" disabled={loading} onClick={loadStatus} type="button">
            Atualizar leitura
          </button>
        )}
      />

      {error ? <p className="institutional-note danger" role="alert">{error}</p> : null}

      <MetricGrid>
        <MetricCard
          label="Sistema"
          value={status ? statusLabel(status.status) : 'Carregando'}
          detail={status ? `Checado em ${formatDate(status.checkedAt)}` : 'Consultando backend'}
          tone={status ? statusTone(status.status) : 'muted'}
        />
        <MetricCard
          label="Banco"
          value={status ? statusLabel(status.dependencies.database.status) : 'Carregando'}
          detail={status?.dependencies.database.latencyMs !== undefined ? `${status.dependencies.database.latencyMs}ms de resposta` : 'Sem leitura'}
          tone={status ? statusTone(status.dependencies.database.status) : 'muted'}
        />
        <MetricCard
          label="Backup"
          value={status ? statusLabel(status.backup.status) : 'Carregando'}
          detail={status?.backup.finishedAt ? `Último em ${formatDate(status.backup.finishedAt)}` : 'Aguardando status'}
          tone={status ? statusTone(status.backup.status) : 'muted'}
        />
        <MetricCard
          label="Erros 24h"
          value={status?.recent.frontendErrors24h ?? 0}
          detail={`${status?.recent.backendErrors24h ?? 0} backend · ${status?.recent.slowRequests24h ?? 0} lentidão`}
          tone={status?.recent.frontendErrors24h || status?.recent.backendErrors24h ? 'warning' : 'success'}
        />
      </MetricGrid>

      <section className="support-grid system-health-grid ds-admin-grid">
        <Panel title="Mapa de prontidão" subtitle="Componentes que sustentam a operação diária.">
          <div className="system-health-stack">
            {dependencies.map((item) => (
              <article className="system-health-row" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <p>{item.component.message}</p>
                <span className={`support-badge ${badgeClass(item.component.status)}`}>
                  {statusLabel(item.component.status)}
                </span>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Backup e restauração" subtitle="Recibo técnico da última execução conhecida.">
          <dl className="system-health-definition">
            <div>
              <dt>Status</dt>
              <dd>{status ? statusLabel(status.backup.status) : 'Carregando'}</dd>
            </div>
            <div>
              <dt>Última conclusão</dt>
              <dd>{formatDate(status?.backup.finishedAt)}</dd>
            </div>
            <div>
              <dt>Duração</dt>
              <dd>{formatDuration(status?.backup.durationSeconds)}</dd>
            </div>
            <div>
              <dt>Banco / uploads</dt>
              <dd>{formatBytes(status?.backup.databaseBytes)} · {formatBytes(status?.backup.uploadsBytes)}</dd>
            </div>
            <div>
              <dt>Remoto</dt>
              <dd>{status?.backup.remoteStatus || 'Não configurado'}</dd>
            </div>
            <div>
              <dt>Arquivo de status</dt>
              <dd>{status?.backup.statusPath || 'Sem caminho'}</dd>
            </div>
          </dl>
        </Panel>

        <Panel className="wide" title="Eventos recentes" subtitle={loading ? 'Carregando eventos...' : `${events.length} eventos nas últimas 24h`}>
          <TableShell className="table-scroll audit-table-scroll">
            <table className="report-table support-table audit-table system-events-table ds-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Nível</th>
                  <th>Origem</th>
                  <th>Mensagem</th>
                  <th>Rastro</th>
                </tr>
              </thead>
              <tbody>
                {events.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{formatDate(entry.criadoEm)}</strong>
                      <span>{entry.durationMs ? `${entry.durationMs}ms` : 'Sem duração'}</span>
                    </td>
                    <td>
                      <span className={`support-badge ${badgeClass(entry.nivel)}`}>
                        {humanize(entry.nivel)}
                      </span>
                    </td>
                    <td>
                      <strong>{humanize(entry.origem)}</strong>
                      <span>{humanize(entry.tipo)}</span>
                    </td>
                    <td className="audit-metadata-cell">
                      <span>{entry.mensagem}</span>
                      <small>{metadataPreview(entry)}</small>
                    </td>
                    <td>
                      <strong>{entry.requestId ? entry.requestId.slice(0, 18) : 'Sem ID'}</strong>
                      <span>{entry.httpStatus ? `HTTP ${entry.httpStatus}` : entry.usuarioLogin || 'Sistema'}</span>
                    </td>
                  </tr>
                ))}

                {!events.length ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="audit-empty ds-empty-state">
                        <strong>Nenhum evento recente.</strong>
                        <span>Quando houver erro de frontend, lentidão ou falha backend, ele aparece aqui.</span>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </TableShell>
        </Panel>

        <Panel title="Runtime" subtitle="Leitura objetiva do processo backend.">
          <dl className="system-health-definition compact">
            <div>
              <dt>Ambiente</dt>
              <dd>{status?.environment || 'Sem leitura'}</dd>
            </div>
            <div>
              <dt>Versão</dt>
              <dd>{status?.version || 'local'}</dd>
            </div>
            <div>
              <dt>Uptime</dt>
              <dd>{formatDuration(status?.uptimeSeconds)}</dd>
            </div>
            <div>
              <dt>Memória</dt>
              <dd>{status ? `${status.memory.heapUsedMb}MB heap · ${status.memory.rssMb}MB RSS` : 'Sem leitura'}</dd>
            </div>
          </dl>
        </Panel>
      </section>
    </main>
  );
};

export default SupportSystemHealthPage;
