import { Module } from '@nestjs/common';
import { QualidadeDadosController } from './qualidade-dados.controller';
import { QualidadeDadosService } from './qualidade-dados.service';

@Module({
  controllers: [QualidadeDadosController],
  providers: [QualidadeDadosService],
})
export class QualidadeDadosModule {}
