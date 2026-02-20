import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prontuario } from '../../entities/prontuario.entity';
import { ProntuariosController } from './prontuarios.controller';
import { ProntuariosService } from './prontuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Prontuario])],
  controllers: [ProntuariosController],
  providers: [ProntuariosService],
  exports: [ProntuariosService],
})
export class ProntuariosModule {}
