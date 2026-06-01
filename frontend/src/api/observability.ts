import { apiFetch } from './http';

export type ComponentHealthStatus = 'ok' | 'warning' | 'down' | 'unknown';

export interface ObservabilityComponentStatus {
  status: ComponentHealthStatus;
  latencyMs?: number | null;
  message: string;
  path?: string;
}

export interface BackupHealthStatus {
  status: ComponentHealthStatus;
  message: string;
  statusPath: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationSeconds: number | null;
  backupPath: string | null;
  remoteStatus: string | null;
  databaseBytes: number | null;
  uploadsBytes: number | null;
  ageHours: number | null;
}

export interface SystemHealthStatus {
  status: ComponentHealthStatus;
  checkedAt: string;
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  dependencies: {
    database: ObservabilityComponentStatus;
    redis: ObservabilityComponentStatus;
    uploads: ObservabilityComponentStatus;
  };
  backup: BackupHealthStatus;
  recent: {
    events24h: number;
    frontendErrors24h: number;
    backendErrors24h: number;
    slowRequests24h: number;
  };
}

export type ObservabilityEventLevel = 'info' | 'aviso' | 'erro';

export interface ObservabilityEventEntry {
  id: string;
  tipo: string;
  origem: string;
  nivel: ObservabilityEventLevel;
  mensagem: string;
  requestId: string | null;
  usuarioLogin: string | null;
  usuarioRole: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  metadata: Record<string, unknown> | null;
  criadoEm: string;
}

export interface ObservabilityEventsResponse {
  data: ObservabilityEventEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListObservabilityEventsParams {
  page?: number;
  limit?: number;
  tipo?: string;
  origem?: string;
  nivel?: ObservabilityEventLevel | '';
  horas?: number;
}

export interface FrontendErrorReportPayload {
  message: string;
  source?: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  release?: string;
  metadata?: Record<string, unknown>;
}

export async function getSystemHealthStatus() {
  return apiFetch<SystemHealthStatus>('/api/observabilidade/sistema/status');
}

export async function getBackupHealthStatus() {
  return apiFetch<BackupHealthStatus>('/api/observabilidade/backups/status');
}

export async function listObservabilityEvents(params: ListObservabilityEventsParams = {}) {
  const suffix = buildQuerySuffix(params);
  return apiFetch<ObservabilityEventsResponse>(`/api/observabilidade/eventos${suffix}`);
}

export async function reportFrontendError(data: FrontendErrorReportPayload) {
  return apiFetch<{ status: string; requestId?: string }>('/api/observabilidade/frontend-errors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

function buildQuerySuffix(params: object) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, String(value));
    }
  });

  return query.toString() ? `?${query.toString()}` : '';
}
