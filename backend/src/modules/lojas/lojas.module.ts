import { Module } from '@nestjs/common';
import { WebSocketModule } from '../websocket/websocket.module';
import { LojasController } from './lojas.controller';
import { LojasService } from './lojas.service';

@Module({
  imports: [WebSocketModule],
  controllers: [LojasController],
  providers: [LojasService],
})
export class LojasModule {}
