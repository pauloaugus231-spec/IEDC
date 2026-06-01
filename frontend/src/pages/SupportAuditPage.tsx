import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listAuditLogs,
  type AuditLogEntry,
  type AuditStatus,
  type AuditLogsResponse,
} from '../api';
import { MetricCard, MetricGrid, PageHeader, Panel, TableShell } from '../components/DesignSystem';
import '../styles/institutional.css';
import '../styles/design-system.css';

const allEntityOptions = [
  { value: '', label: 'Todas as áreas' },
  { value: 'auth', label: 'Acessos' },
  { value: 'usuarios', label: 'Usuários' },
  { value: 'pessoas', label: 'Pessoas' },
  { value: 'estadias', label: 'Estadias' },
  { value: 'bloqueios', label: 'Bloqueios' },
  { value: 'creche', label: 'E.E.I.' },
  { value: 'lojas', label: 'Lojas' },
  { value: 'rma', label: 'RMA' },
  { value: 'impacto-social', label: 'Impacto social' },
];

const pageCopy = {
  eyebrow: 'Suporte institucional',
  title: 'Auditoria técnica',
  description: 'Consulte logs técnicos, acessos sensíveis, falhas recorrentes e metadados necessários para sustentação do sistema.',
};

const statusOptions: Array<{ value: AuditStatus | ''; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'sucesso', label: 'Sucesso' },
  { value: 'falha', label: 'Falha' },
];

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(value: string | null | undefined) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sem data' : dateFormatter.format(date);
}

function humanize(value: string | null | undefined) {
  if (!value) return 'Sem informação';
  return value
    .replace(/[_:.]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'vazio';
  if (typeof value === 'string') return value.length > 90 ? `${value.slice(0, 90)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  try {
    const json = JSON.stringify(value);
    return json.length > 90 ? `${json.slice(0, 90)}...` : json;
  } catch {
    return 'dado registrado';
  }
}

function metadataPreview(entry: AuditLogEntry) {
  if (!entry.metadata || !Object.keys(entry.metadata).length) {
    return 'Sem metadados operacionais.';
  }

  return Object.entries(entry.metadata)
    .slice(0, 3)
    .map(([key, value]) => `${humanize(key)}: ${formatMetaValue(value)}`)
    .join(' · ');
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const SupportAuditPage = () => {
  const [response, setResponse] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [status, setStatus] = useState<AuditStatus | ''>('');
  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [acao, setAcao] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setResponse(await listAuditLogs({
        page,
        limit: 30,
        entidade: entity,
        usuarioLogin: usuarioLogin.trim().toLowerCase(),
        status,
        acao: acao.trim(),
      }));
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível carregar a auditoria.'));
    } finally {
      setLoading(false);
    }
  }, [acao, entity, page, status, usuarioLogin]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const logs = useMemo(() => response?.data ?? [], [response]);
  const meta = response?.meta ?? { page: 1, limit: 30, total: 0, totalPages: 1 };
  const entityOptions = allEntityOptions;
  const showTechnical = true;

  const metrics = useMemo(() => {
    const failures = logs.filter((entry) => entry.status === 'falha').length;
    const actors = new Set(logs.map((entry) => entry.usuarioLogin).filter(Boolean)).size;

    return {
      total: meta.total,
      failures,
      actors,
      latest: formatDate(logs[0]?.criadoEm),
      recurringFailures: meta.recurringFailures?.length ?? 0,
    };
  }, [logs, meta.recurringFailures?.length, meta.total]);

  const resetFilters = () => {
    setEntity('');
    setStatus('');
    setUsuarioLogin('');
    setAcao('');
    setPage(1);
  };

  const updatePage = (nextPage: number) => {
    const totalPages = Math.max(1, meta.totalPages || 1);
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  };

  return (
    <main className="page-band support-page audit-page ds-admin-surface">
      <PageHeader
        className="audit-head"
        eyebrow={pageCopy.eyebrow}
        title={pageCopy.title}
        description={pageCopy.description}
        actions={(
          <>
          <button className="creche-head-link secondary ds-button" onClick={resetFilters} type="button">
            Limpar filtros
          </button>
          <button className="creche-head-link ds-button" disabled={loading} onClick={loadLogs} type="button">
            Atualizar
          </button>
          </>
        )}
      />

      <MetricGrid>
        <MetricCard label="Registros" value={metrics.total} detail="Eventos encontrados no filtro atual" />
        <MetricCard
          label="Falhas na página"
          value={metrics.failures}
          detail={showTechnical ? 'Eventos que exigem leitura técnica' : 'Eventos que exigem atenção de gestão'}
          tone={metrics.failures ? 'warning' : 'default'}
        />
        <MetricCard label="Responsáveis" value={metrics.actors} detail="Usuários distintos nesta página" />
        <MetricCard
          label={showTechnical ? 'Falhas recorrentes' : 'Último evento'}
          value={showTechnical ? metrics.recurringFailures : <span className="audit-metric-date">{metrics.latest}</span>}
          detail={showTechnical ? 'Agrupadas nesta leitura técnica' : 'Registro mais recente carregado'}
          tone={showTechnical && metrics.recurringFailures ? 'warning' : 'default'}
        />
      </MetricGrid>

      {error ? <p className="institutional-note danger" role="alert">{error}</p> : null}

      <Panel
        className="audit-panel"
        title="Consulta de registros"
        subtitle={loading ? 'Carregando registros...' : `${logs.length} registros nesta página`}
        actions={(
          <div className="audit-pagination ds-pagination">
            <button className="table-action secondary ds-row-action" disabled={page <= 1 || loading} onClick={() => updatePage(page - 1)} type="button">
              Anterior
            </button>
            <span>Página {meta.page} de {Math.max(1, meta.totalPages || 1)}</span>
            <button
              className="table-action secondary ds-row-action"
              disabled={page >= Math.max(1, meta.totalPages || 1) || loading}
              onClick={() => updatePage(page + 1)}
              type="button"
            >
              Próxima
            </button>
          </div>
        )}
      >

        <div className="audit-toolbar ds-toolbar" aria-label="Filtros de auditoria">
          <label>
            Área
            <select
              onChange={(event) => {
                setEntity(event.target.value);
                setPage(1);
              }}
              value={entity}
            >
              {entityOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              onChange={(event) => {
                setStatus(event.target.value as AuditStatus | '');
                setPage(1);
              }}
              value={status}
            >
              {statusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Usuário
            <input
              onChange={(event) => {
                setUsuarioLogin(event.target.value);
                setPage(1);
              }}
              placeholder="login do usuário"
              value={usuarioLogin}
            />
          </label>
          <label>
            Ação
            <input
              onChange={(event) => {
                setAcao(event.target.value);
                setPage(1);
              }}
              placeholder="criar, editar, login..."
              value={acao}
            />
          </label>
        </div>

        <TableShell className="table-scroll audit-table-scroll">
          <table className="report-table support-table audit-table ds-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Ação</th>
                <th>Área</th>
                <th>Responsável</th>
                <th>Status</th>
                {showTechnical ? <th>Registro técnico</th> : null}
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{formatDate(entry.criadoEm)}</strong>
                    <span>{showTechnical ? entry.ip || 'IP não registrado' : 'Registro institucional'}</span>
                  </td>
                  <td className="audit-action-cell">
                    <strong>{humanize(entry.acao)}</strong>
                    <span>{entry.entidadeId ? `ID ${entry.entidadeId}` : 'Sem ID vinculado'}</span>
                  </td>
                  <td>
                    <strong>{humanize(entry.entidade)}</strong>
                    <span>{entry.httpStatus ? `HTTP ${entry.httpStatus}` : 'Sem código HTTP'}</span>
                  </td>
                  <td>
                    <strong>{entry.usuarioLogin || 'Sistema'}</strong>
                    <span>{entry.usuarioRole ? humanize(entry.usuarioRole) : 'Sem perfil'}</span>
                  </td>
                  <td>
                    <span className={`support-badge ${entry.status === 'sucesso' ? 'ok' : 'danger'}`}>
                      {entry.status === 'sucesso' ? 'Sucesso' : 'Falha'}
                    </span>
                  </td>
                  {showTechnical ? (
                    <td className="audit-metadata-cell">
                      <span>{metadataPreview(entry)}</span>
                      <small>{entry.userAgent ? entry.userAgent.slice(0, 120) : 'Agente não registrado'}</small>
                    </td>
                  ) : null}
                </tr>
              ))}

              {!logs.length && !loading ? (
                <tr>
                  <td colSpan={showTechnical ? 6 : 5}>
                    <div className="audit-empty ds-empty-state">
                      <strong>Nenhum registro encontrado.</strong>
                      <span>Ajuste os filtros ou atualize a consulta.</span>
                    </div>
                  </td>
                </tr>
              ) : null}

              {loading ? (
                <tr>
                  <td colSpan={showTechnical ? 6 : 5}>
                    <div className="audit-empty ds-empty-state">
                      <strong>Carregando auditoria.</strong>
                      <span>Consultando os eventos registrados no backend.</span>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableShell>
      </Panel>
    </main>
  );
};

export default SupportAuditPage;
