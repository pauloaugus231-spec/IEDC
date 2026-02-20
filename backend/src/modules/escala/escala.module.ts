import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscalaService } from './escala.service';
import { EscalaController } from './escala.controller';
import { Escala } from '../../entities/escala.entity';
import { RegraEscala } from '../../entities/regra-escala.entity';
import { Plantao } from '../../entities/plantao.entity';
import { Colaborador } from '../../entities/colaborador.entity';
import { RegrasEscalaModule } from '../regras-escala/regras-escala.module';
import { PlantoesModule } from '../plantoes/plantoes.module';
import { ColaboradoresModule } from '../colaboradores/colaboradores.module';
import { GerarEscalaController } from './gerar-escala.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Escala, RegraEscala, Plantao, Colaborador]),
    RegrasEscalaModule,
    PlantoesModule,
    ColaboradoresModule,
  ],
  controllers: [EscalaController, GerarEscalaController],
  providers: [EscalaService],
})
export class EscalaModule {}
