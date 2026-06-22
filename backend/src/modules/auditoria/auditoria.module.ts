import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria } from '../../entities/auditoria.entity';
import { CORE_DATABASE_CONNECTION } from '../../config/database.config';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';

@Module({
  imports: [TypeOrmModule.forFeature([Auditoria], CORE_DATABASE_CONNECTION)],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
