import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthRequest } from '../../auth/auth.types';
import { AuditoriaService } from '../../modules/auditoria/auditoria.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  constructor(private readonly auditoriaService: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    if (!this.shouldAudit(request)) {
      return next.handle();
    }

    const startedAt = Date.now();
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();

    return next.handle().pipe(
      tap({
        next: () => {
          this.record(request, 'sucesso', response.statusCode ?? 200, Date.now() - startedAt);
        },
        error: (error) => {
          this.record(
            request,
            'falha',
            typeof error?.status === 'number' ? error.status : response.statusCode ?? 500,
            Date.now() - startedAt,
            error instanceof Error ? error.name : 'Error',
          );
        },
      }),
    );
  }

  private shouldAudit(request: AuthRequest) {
    if (!this.mutatingMethods.has(request.method)) {
      return false;
    }

    const path = this.getPath(request);
    return !path.startsWith('/api/auth/login');
  }

  private record(
    request: AuthRequest,
    status: 'sucesso' | 'falha',
    httpStatus: number,
    durationMs: number,
    errorName?: string,
  ) {
    const path = this.getPath(request);
    const pathParts = path.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    const entidade = pathParts[0] || 'sistema';
    const entityId = this.resolveEntityId(request, pathParts);

    void this.auditoriaService.registrar({
      acao: `${request.method} ${path}`,
      entidade,
      entidadeId: entityId,
      actor: request.user ?? null,
      ip: request.ip,
      userAgent: typeof request.get === 'function' ? request.get('user-agent') : undefined,
      status,
      httpStatus,
      metadata: {
        requestId: request.requestId,
        params: this.safeKeys(request.params),
        query: this.safeKeys(request.query),
        body: this.safeKeys(request.body),
        durationMs,
        errorName,
      },
    });
  }

  private resolveEntityId(request: AuthRequest, pathParts: string[]) {
    const params = request.params ?? {};
    return (
      params.id ||
      params.pessoaId ||
      params.pessoa_id ||
      params.codigo ||
      pathParts.find((part) => /^[0-9a-f-]{16,}$/i.test(part)) ||
      null
    );
  }

  private safeKeys(value: unknown) {
    if (!value || typeof value !== 'object') {
      return [];
    }

    return Object.keys(value as Record<string, unknown>).slice(0, 40);
  }

  private getPath(request: AuthRequest) {
    return (request.originalUrl || request.url || '').split('?')[0].replace(/\/+$/, '');
  }
}
