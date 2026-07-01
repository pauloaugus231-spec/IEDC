import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TriagemController } from './triagem.controller';
import { TriagemService } from './triagem.service';
import { Pessoa } from '../../entities/pessoa.entity';
import { Estadia } from '../../entities/estadia.entity';
import { Ocorrencia } from '../../entities/ocorrencia.entity';
import { Cama } from '../../entities/cama.entity';
import { Bloqueio } from '../../entities/bloqueio.entity';
import { TriagemFechamento } from '../../entities/triagem-fechamento.entity';
import { TriagemAbertura } from '../../entities/triagem-abertura.entity';
import { DashboardModule } from '../dashboard/dashboard.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pessoa, Estadia, Ocorrencia, Cama, Bloqueio, TriagemFechamento, TriagemAbertura]),
    DashboardModule,
    TelegramModule,
  ],
  controllers: [TriagemController],
  providers: [TriagemService],
  exports: [TriagemService],
})
export class TriagemModule {}
