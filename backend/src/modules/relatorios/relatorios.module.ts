import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelatoriosController } from './relatorios.controller';
import { RelatoriosService } from './relatorios.service';
import { Pessoa } from '../../entities/pessoa.entity';
import { Estadia } from '../../entities/estadia.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pessoa, Estadia])],
  controllers: [RelatoriosController],
  providers: [RelatoriosService],
})
export class RelatoriosModule {}
