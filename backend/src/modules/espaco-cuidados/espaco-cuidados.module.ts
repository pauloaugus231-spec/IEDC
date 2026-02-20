import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EspacoCuidadosController } from './espaco-cuidados.controller';
import { EspacoCuidadosService } from './espaco-cuidados.service';
import { SessaoEspacoCuidados } from '../../entities/sessao-espaco-cuidados.entity';
import { FilaEspacoCuidados } from '../../entities/fila-espaco-cuidados.entity';
import { Pessoa } from '../../entities/pessoa.entity';
import { WebSocketModule } from '../websocket/websocket.module';
import { TelegramModule } from '../telegram/telegram.module';
import { ProntuariosModule } from '../prontuarios/prontuarios.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SessaoEspacoCuidados,
      FilaEspacoCuidados,
      Pessoa,
    ]),
    WebSocketModule,
    forwardRef(() => TelegramModule),
    ProntuariosModule,
  ],
  controllers: [EspacoCuidadosController],
  providers: [EspacoCuidadosService],
  exports: [EspacoCuidadosService],
})
export class EspacoCuidadosModule {}
