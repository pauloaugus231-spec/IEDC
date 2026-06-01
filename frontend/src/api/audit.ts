import { apiFetch } from './http';

export type AuditStatus = 'sucesso' | 'falha';

export interface AuditLogEntry {
  id: string;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  usuarioId: string | null;
  usuarioLogin: string | null;
  usuarioRole: string | null;
  ip: string | null;
  userAgent: string | null;
  status: AuditStatus;
  httpStatus: number | null;
  metadata: Record<string, unknown> | null;
  criadoEm: string;
}

export interface AuditLogsResponse {
  data: AuditLogEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    audience?: 'suporte' | 'executiva' | 'albergue' | 'creche' | 'financeiro';
    recurringFailures?: Array<{ entidade: string; acao: string; total: number }>;
  };
}

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  entidade?: string;
  usuarioLogin?: string;
  status?: AuditStatus | '';
  acao?: string;
}

export async function listAuditLogs(params: ListAuditLogsParams = {}) {
  const suffix = buildQuerySuffix(params);
  return apiFetch<AuditLogsResponse>(`/api/auditoria${suffix}`);
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
