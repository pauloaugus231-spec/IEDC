import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-store';

// Interceptors
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
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthController } from './health.controller';

// Configuração do banco
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Schedule (cron jobs)
    ScheduleModule.forRoot(),

    // TypeORM
    TypeOrmModule.forRootAsync({
      useFactory: () => databaseConfig,
    }),

    // Cache Redis
    CacheModule.register({
      isGlobal: true,
      store: redisStore as any,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ttl: 300, // 5 minutos padrão
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
  ],
  controllers: [HealthController],
  providers: [
    // ✅ Registrar interceptor de performance globalmente
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
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
