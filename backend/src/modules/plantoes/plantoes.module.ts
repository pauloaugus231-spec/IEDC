import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plantao } from '../../entities/plantao.entity';
import { RegraEscala } from '../../entities/regra-escala.entity';
import { Colaborador } from '../../entities/colaborador.entity';
import { Turno } from '../../entities/turno.entity';
import { PlantoesController } from './plantoes.controller';
import { PlantoesService } from './plantoes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plantao, RegraEscala, Colaborador, Turno]),
  ],
  controllers: [PlantoesController],
  providers: [PlantoesService],
  exports: [PlantoesService],
})
export class PlantoesModule {}
