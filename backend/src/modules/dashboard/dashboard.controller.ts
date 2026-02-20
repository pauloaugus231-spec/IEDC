import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('ocupacao')
  async getOcupacao() {
    return this.dashboardService.getOcupacao();
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
