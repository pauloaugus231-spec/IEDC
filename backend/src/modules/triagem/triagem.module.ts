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
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pessoa, Estadia, Ocorrencia, Cama, Bloqueio, TriagemFechamento]),
    DashboardModule,
  ],
  controllers: [TriagemController],
  providers: [TriagemService],
})
export class TriagemModule {}
