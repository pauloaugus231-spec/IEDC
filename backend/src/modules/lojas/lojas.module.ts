import { Module } from '@nestjs/common';
import { WebSocketModule } from '../websocket/websocket.module';
import { LojasCaixaService } from './lojas-caixa.service';
import { LojasCatalogoService } from './lojas-catalogo.service';
import { LojasClientesService } from './lojas-clientes.service';
import { LojasComandasService } from './lojas-comandas.service';
import { LojasController } from './lojas.controller';
import { LojasEventsService } from './lojas-events.service';
import { LojasExportService } from './lojas-export.service';
import { LojasRetiradasService } from './lojas-retiradas.service';
import { LojasSchemaService } from './lojas-schema.service';
import { LojasService } from './lojas.service';
import { LojasLegacyMigrationService } from './lojas-legacy-migration.service';

@Module({
  imports: [WebSocketModule],
  controllers: [LojasController],
  providers: [
    LojasSchemaService,
    LojasLegacyMigrationService,
    LojasEventsService,
    LojasCatalogoService,
    LojasCaixaService,
    LojasClientesService,
    LojasComandasService,
    LojasRetiradasService,
    LojasExportService,
    LojasService,
  ],
})
export class LojasModule {}
