import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthRequest } from '../../auth/auth.types';
import { ObservabilityService } from '../../modules/observability/observability.service';

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');
  private readonly slowThreshold = parsePositiveIntegerEnv('SLOW_REQUEST_MS', 500);
  private readonly verySlowThreshold = parsePositiveIntegerEnv('VERY_SLOW_REQUEST_MS', 1000);

  constructor(private readonly observabilityService: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const response = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const { method, url, ip } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;

          if (duration > this.verySlowThreshold) {
            this.logger.error({
              event: 'http.very_slow_request',
              requestId: request.requestId,
              method,
              url,
              ip,
              durationMs: duration,
              statusCode: response.statusCode ?? 200,
            });
            this.recordSlowRequest(request, duration, response.statusCode ?? 200, 'erro');
          } else if (duration > this.slowThreshold) {
            this.logger.warn({
              event: 'http.slow_request',
              requestId: request.requestId,
              method,
              url,
              durationMs: duration,
              statusCode: response.statusCode ?? 200,
            });
            this.recordSlowRequest(request, duration, response.statusCode ?? 200, 'aviso');
          }

          if (process.env.NODE_ENV === 'development' && duration > 100) {
            this.logger.debug({
              event: 'http.request_timing',
              requestId: request.requestId,
              method,
              url,
              durationMs: duration,
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error({
            event: 'http.request_error',
            requestId: request.requestId,
            method,
            url,
            durationMs: duration,
            statusCode: typeof error?.status === 'number' ? error.status : response.statusCode ?? 500,
            errorName: error instanceof Error ? error.name : 'Error',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
          });
          void this.observabilityService.registrarEvento({
            tipo: 'backend_error',
            origem: 'backend',
            nivel: 'erro',
            mensagem: error instanceof Error ? error.message : 'Erro na requisição backend',
            requestId: request.requestId,
            actor: request.user ?? null,
            httpStatus: typeof error?.status === 'number' ? error.status : response.statusCode ?? 500,
            durationMs: duration,
            metadata: {
              method,
              url,
              errorName: error instanceof Error ? error.name : 'Error',
            },
          });
        },
      }),
    );
  }

  private recordSlowRequest(
    request: AuthRequest,
    durationMs: number,
    statusCode: number,
    nivel: 'aviso' | 'erro',
  ) {
    void this.observabilityService.registrarEvento({
      tipo: 'slow_request',
      origem: 'backend',
      nivel,
      mensagem: `${request.method} ${request.url}`,
      requestId: request.requestId,
      actor: request.user ?? null,
      httpStatus: statusCode,
      durationMs,
      metadata: {
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
    });
  }
}
