import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BloqueiosController } from './bloqueios.controller';
import { BloqueiosService } from './bloqueios.service';
import { Bloqueio } from '../../entities/bloqueio.entity';
import { Ocorrencia } from '../../entities/ocorrencia.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bloqueio, Ocorrencia])],
  controllers: [BloqueiosController],
  providers: [BloqueiosService],
  exports: [BloqueiosService],
})
export class BloqueiosModule {}
