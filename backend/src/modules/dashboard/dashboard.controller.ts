import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';

@Controller('dashboard')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE, UsuarioRole.EDUCADOR_ALBERGUE)
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
