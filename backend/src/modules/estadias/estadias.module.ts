import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estadia } from '../../entities/estadia.entity';
import { EstadiasService } from './estadias.service';
import { EstadiasController } from './estadias.controller';
import { DiagnosticoController } from './diagnostico.controller';
import { Cama } from '../../entities/cama.entity';
import { Pessoa } from '../../entities/pessoa.entity';
import { DashboardModule } from '../dashboard/dashboard.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { CheckoutAutomaticoService } from './checkout-automatico.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estadia, Cama, Pessoa]),
    DashboardModule,
    WebSocketModule,
  ],
  providers: [EstadiasService, CheckoutAutomaticoService],
  controllers: [EstadiasController, DiagnosticoController],
})
export class EstadiasModule {}
