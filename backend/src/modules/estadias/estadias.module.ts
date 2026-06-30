import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estadia } from '../../entities/estadia.entity';
import { EstadiasService } from './estadias.service';
import { EstadiasController } from './estadias.controller';
import { Cama } from '../../entities/cama.entity';
import { Pessoa } from '../../entities/pessoa.entity';
import { DashboardModule } from '../dashboard/dashboard.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { CheckoutAutomaticoService } from './checkout-automatico.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estadia, Cama, Pessoa]),
    DashboardModule,
    WebSocketModule,
    TelegramModule,
  ],
  providers: [EstadiasService, CheckoutAutomaticoService],
  controllers: [EstadiasController],
})
export class EstadiasModule {}
