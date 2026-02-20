import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { EspacoCuidadosModule } from '../espaco-cuidados/espaco-cuidados.module';

@Module({
  imports: [forwardRef(() => EspacoCuidadosModule)],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
