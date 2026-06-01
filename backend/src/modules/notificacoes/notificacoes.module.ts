import { Module } from '@nestjs/common';
import { ObservabilityModule } from '../observability/observability.module';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';

@Module({
  imports: [ObservabilityModule],
  controllers: [NotificacoesController],
  providers: [NotificacoesService],
})
export class NotificacoesModule {}
