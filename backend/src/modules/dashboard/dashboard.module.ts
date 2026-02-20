import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Estadia } from '../../entities/estadia.entity';
import { Cama } from '../../entities/cama.entity';
import { Pessoa } from '../../entities/pessoa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Estadia, Cama, Pessoa])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
