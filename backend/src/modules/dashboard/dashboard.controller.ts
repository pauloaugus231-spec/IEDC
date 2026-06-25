import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../auth/roles.decorator';
import { ALBERGUE_READ_ROLES } from '../../auth/albergue-roles';

@Controller('dashboard')
@Roles(...ALBERGUE_READ_ROLES)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('ocupacao')
  async getOcupacao() {
    return this.dashboardService.getOcupacao();
  }

  @Get('ocupacao-historico')
  async getOcupacaoHistorico(@Query('periodo') periodo?: string) {
    return this.dashboardService.getOcupacaoHistorico(periodo);
  }

  @Get('relatorios/sociais')
  async getRelatoriosSociais(@Query('inicio') inicio?: string, @Query('fim') fim?: string) {
    return this.dashboardService.getRelatoriosSociais(inicio, fim);
  }

  @Get('saidas-previstas-hoje')
  async getSaidasPrevistasHoje() {
    const count = await this.dashboardService.getSaidasPrevistasHoje();
    return { count };
  }
}
