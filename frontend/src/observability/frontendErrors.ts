import { getAuthToken, type FrontendErrorReportPayload } from '../api';

const MAX_REPORTS_PER_MINUTE = 8;
const MAX_TEXT_LENGTH = 6_000;

let windowStartedAt = Date.now();
let reportsInWindow = 0;
let lastSignature = '';
let lastSignatureAt = 0;

function truncate(value: string | undefined, max = MAX_TEXT_LENGTH) {
  if (!value) return undefined;
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function shouldReport(payload: FrontendErrorReportPayload) {
  if (import.meta.env.VITE_FRONTEND_ERROR_REPORTING === 'false') {
    return false;
  }

  const now = Date.now();

  if (now - windowStartedAt > 60_000) {
    windowStartedAt = now;
    reportsInWindow = 0;
  }

  if (reportsInWindow >= MAX_REPORTS_PER_MINUTE) {
    return false;
  }

  const signature = `${payload.source || 'runtime'}:${payload.message}:${payload.url || ''}`;
  if (signature === lastSignature && now - lastSignatureAt < 10_000) {
    return false;
  }

  lastSignature = signature;
  lastSignatureAt = now;
  reportsInWindow += 1;
  return true;
}

export function normalizeErrorPayload(
  error: unknown,
  source: string,
  extra?: Record<string, unknown>,
): FrontendErrorReportPayload {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Erro não identificado no frontend';
  const stack = error instanceof Error ? error.stack : undefined;

  return {
    message: truncate(message, 500) || 'Erro não identificado no frontend',
    source,
    stack: truncate(stack),
    url: window.location.href,
    release: import.meta.env.VITE_APP_VERSION || import.meta.env.MODE || 'local',
    metadata: {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      ...extra,
    },
  };
}

export function sendFrontendErrorReport(payload: FrontendErrorReportPayload) {
  if (!shouldReport(payload)) {
    return;
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  const token = getAuthToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  void fetch('/api/observabilidade/frontend-errors', {
    method: 'POST',
    headers,
    credentials: 'include',
    keepalive: true,
    body: JSON.stringify({
      ...payload,
      message: truncate(payload.message, 500) || 'Erro não identificado no frontend',
      stack: truncate(payload.stack),
      componentStack: truncate(payload.componentStack),
      url: truncate(payload.url, 500),
    }),
  }).catch(() => undefined);
}
