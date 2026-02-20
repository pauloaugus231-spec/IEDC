import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor para monitorar performance de requisições
 * Loga automaticamente requisições que demoram mais de 500ms
 * 
 * Uso: Adicionar em app.module.ts ou em controllers específicos
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: PerformanceInterceptor,
 *     },
 *   ],
 * })
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');
  private readonly SLOW_THRESHOLD = 500; // ms
  private readonly VERY_SLOW_THRESHOLD = 1000; // ms

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          
          // Logar requisições lentas (> 500ms)
          if (duration > this.VERY_SLOW_THRESHOLD) {
            this.logger.error(
              `🔴 Requisição MUITO LENTA: ${method} ${url} - ${duration}ms | IP: ${ip}`
            );
          } else if (duration > this.SLOW_THRESHOLD) {
            this.logger.warn(
              `⚠️ Requisição lenta: ${method} ${url} - ${duration}ms`
            );
          }
          
          // Log detalhado para desenvolvimento (opcional)
          if (process.env.NODE_ENV === 'development' && duration > 100) {
            this.logger.debug(
              `📊 ${method} ${url} - ${duration}ms`
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(
            `❌ Erro na requisição: ${method} ${url} - ${duration}ms | Erro: ${error.message}`
          );
        },
      }),
    );
  }
}
