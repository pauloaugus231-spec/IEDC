import { Module } from '@nestjs/common';
import { DiasCruzGateway } from './websocket.gateway';

@Module({
  providers: [DiasCruzGateway],
  exports: [DiasCruzGateway],
})
export class WebSocketModule {}
