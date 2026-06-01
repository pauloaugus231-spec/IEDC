import {
  Controller,
  Get,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PlantoesService, PlantaoFilters, PlantaoDto } from './plantoes.service';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';

@ApiTags('plantoes')
@Controller('plantoes')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE)
export class PlantoesController {
  constructor(private readonly plantoesService: PlantoesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar plantões com filtros' })
  @ApiQuery({ name: 'data_inicio', required: false, type: String })
  @ApiQuery({ name: 'data_fim', required: false, type: String })
  @ApiQuery({ name: 'mes', required: false, type: String, description: 'Mês no formato YYYY-MM' })
  @ApiQuery({ name: 'colaborador_id', required: false, type: String })
  @ApiQuery({ name: 'turno_id', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de plantões' })
  findAll(
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
    @Query('mes') mes?: string,
    @Query('colaborador_id') colaboradorId?: string,
    @Query('turno_id') turnoId?: string,
  ): Promise<PlantaoDto[]> {
    const filters: PlantaoFilters = {
      data_inicio: dataInicio,
      data_fim: dataFim,
      colaborador_id: colaboradorId,
      turno_id: turnoId,
    };

    // Se foi passado o parâmetro 'mes', converter para data_inicio e data_fim
    if (mes && !dataInicio && !dataFim) {
      const [year, month] = mes.split('-').map(Number);
      const dataInicioMes = new Date(year, month - 1, 1);
      const dataFimMes = new Date(year, month, 0); // Último dia do mês
      
      filters.data_inicio = dataInicioMes.toISOString().split('T')[0];
      filters.data_fim = dataFimMes.toISOString().split('T')[0];
    }

    return this.plantoesService.findAll(filters);
  }

  @Post('gerar')
  @ApiOperation({ summary: 'Gerar plantões baseado nas regras' })
  @ApiResponse({ status: 201, description: 'Plantões gerados com sucesso' })
  async gerarPlantoes(
    @Body() body: { dataInicio: string; dataFim: string },
  ): Promise<{ message: string }> {
    await this.plantoesService.gerarPlantoes(new Date(body.dataInicio), new Date(body.dataFim));
    return { message: 'Plantões gerados com sucesso' };
  }
}
