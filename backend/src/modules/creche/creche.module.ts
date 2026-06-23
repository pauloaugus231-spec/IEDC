import { Module } from '@nestjs/common';
import { CrecheCadastrosService } from './creche-cadastros.service';
import { CrecheDashboardService } from './creche-dashboard.service';
import { CrecheController } from './creche.controller';
import { CrecheSchemaService } from './creche-schema.service';
import { CrecheTurmasService } from './creche-turmas.service';
import { CrecheService } from './creche.service';
import { EscolaLegacyMigrationService } from './escola-legacy-migration.service';

@Module({
  controllers: [CrecheController],
  providers: [
    CrecheSchemaService,
    EscolaLegacyMigrationService,
    CrecheCadastrosService,
    CrecheDashboardService,
    CrecheTurmasService,
    CrecheService,
  ],
})
export class CrecheModule {}
