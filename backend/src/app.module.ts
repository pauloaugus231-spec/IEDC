import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// Interceptors
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';

// Módulos da aplicação
import { PessoasModule } from './modules/pessoas/pessoas.module';
import { EstadiasModule } from './modules/estadias/estadias.module';
import { BloqueiosModule } from './modules/bloqueios/bloqueios.module';
import { OcorrenciasModule } from './modules/ocorrencias/ocorrencias.module';
import { SolicitacoesModule } from './modules/solicitacoes/solicitacoes.module';
import { FilesModule } from './modules/files/files.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CamasModule } from './modules/camas/camas.module';
import { RelatoriosModule } from './modules/relatorios/relatorios.module';
import { EscalaModule } from './modules/escala/escala.module';
import { ColaboradoresModule } from './modules/colaboradores/colaboradores.module';
import { TurnosModule } from './modules/turnos/turnos.module';
import { RegrasEscalaModule } from './modules/regras-escala/regras-escala.module';
import { PlantoesModule } from './modules/plantoes/plantoes.module';
import { TriagemModule } from './modules/triagem/triagem.module';
import { RmaModule } from './modules/rma/rma.module';
import { CrecheModule } from './modules/creche/creche.module';
import { LojasModule } from './modules/lojas/lojas.module';
import { ImpactoSocialModule } from './modules/impacto-social/impacto-social.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { QualidadeDadosModule } from './modules/qualidade-dados/qualidade-dados.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthController } from './health.controller';

// Configuração do banco
import {
  albergueDatabaseConfig,
  coreDatabaseConfig,
} from './config/database.config';

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback;
}

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Schedule (cron jobs)
    ScheduleModule.forRoot(),

    // Rate limiting institucional: proteção básica contra abuso sem atrapalhar uso local.
    // Rotas com limite próprio, como login, sobrescrevem o default no controller.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: parsePositiveIntegerEnv('THROTTLE_DEFAULT_TTL_MS', 60_000),
        limit: parsePositiveIntegerEnv('THROTTLE_DEFAULT_LIMIT', 120),
      },
    ]),

    // TypeORM
    TypeOrmModule.forRootAsync({
      useFactory: () => albergueDatabaseConfig,
    }),
    TypeOrmModule.forRootAsync({
      name: 'core',
      useFactory: () => coreDatabaseConfig,
    }),

    // Cache de aplicação. Redis segue disponível no compose para evolução operacional futura.
    CacheModule.register({
      isGlobal: true,
      ttl: 300_000, // 5 minutos padrão
    }),

    // Módulos da aplicação
    AuthModule,
    PessoasModule,
    EstadiasModule,
    BloqueiosModule,
    OcorrenciasModule,
    SolicitacoesModule,
    FilesModule,
    DashboardModule,
    CamasModule,
    RelatoriosModule,
    EscalaModule,
    ColaboradoresModule,
    TurnosModule,
    RegrasEscalaModule,
    PlantoesModule,
    TriagemModule,
    RmaModule,
    CrecheModule,
    LojasModule,
    ImpactoSocialModule,
    AuditoriaModule,
    ObservabilityModule,
    QualidadeDadosModule,
    NotificacoesModule,
  ],
  controllers: [HealthController],
  providers: [
    // ✅ Registrar interceptor de performance globalmente
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
