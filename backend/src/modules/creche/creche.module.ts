import { Module } from '@nestjs/common';
import { CrecheCadastrosService } from './creche-cadastros.service';
import { CrecheController } from './creche.controller';
import { CrecheSchemaService } from './creche-schema.service';
import { CrecheTurmasService } from './creche-turmas.service';
import { CrecheService } from './creche.service';

@Module({
  controllers: [CrecheController],
  providers: [
    CrecheSchemaService,
    CrecheCadastrosService,
    CrecheTurmasService,
    CrecheService,
  ],
})
export class CrecheModule {}
