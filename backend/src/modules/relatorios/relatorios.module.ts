import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pessoa } from '../../entities/pessoa.entity';
import { Estadia } from '../../entities/estadia.entity';
import { RelatoriosAlbergueService } from './relatorios-albergue.service';
import { RelatoriosController } from './relatorios.controller';
import { RelatoriosGestao360Service } from './relatorios-gestao360.service';
import { RelatoriosImpactoService } from './relatorios-impacto.service';
import { RelatoriosService } from './relatorios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pessoa, Estadia])],
  controllers: [RelatoriosController],
  providers: [
    RelatoriosAlbergueService,
    RelatoriosImpactoService,
    RelatoriosGestao360Service,
    RelatoriosService,
  ],
})
export class RelatoriosModule {}
