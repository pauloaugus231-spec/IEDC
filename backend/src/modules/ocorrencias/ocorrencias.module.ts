import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ocorrencia } from '../../entities/ocorrencia.entity';
import { OcorrenciasService } from './ocorrencias.service';
import { OcorrenciasController } from './ocorrencias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ocorrencia])],
  providers: [OcorrenciasService],
  controllers: [OcorrenciasController],
  exports: [OcorrenciasService],
})
export class OcorrenciasModule {}
