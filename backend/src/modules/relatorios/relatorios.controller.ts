import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';
import { Roles } from '../../auth/roles.decorator';
import { UsuarioRole } from '../../entities/usuario.entity';
import { SalvarDashboardDto } from './dto/salvar-dashboard.dto';
import { AuthRequest } from '../../auth/auth.types';

@Controller('relatorios')
@Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA, UsuarioRole.COORDENADOR_ALBERGUE)
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('executivo')
  @Roles(
    UsuarioRole.GESTORA,
    UsuarioRole.EQUIPE_TECNICA,
    UsuarioRole.COORDENADOR_ALBERGUE,
    UsuarioRole.COORDENADOR_CRECHE,
    UsuarioRole.FINANCEIRO,
  )
  async getRelatorioExecutivo(
    @Req() req: AuthRequest,
    @Query('escopo') escopo?: string,
    @Query('periodo') periodo?: string,
  ) {
    return this.relatoriosService.getRelatorioExecutivo(req.user, escopo, periodo);
  }

  @Get('gestao-360')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA)
  async getRelatorioGestao360(
    @Req() req: AuthRequest,
    @Query('periodo') periodo?: string,
    @Query('metric') metric?: string,
    @Query('dimension') dimension?: string,
    @Query('chart') chart?: string,
  ) {
    return this.relatoriosService.getRelatorioGestao360(req.user, periodo, metric, dimension, chart);
  }

  @Get('gestao-360/drilldown')
  @Roles(UsuarioRole.GESTORA, UsuarioRole.EQUIPE_TECNICA)
  async getRelatorioGestao360Drilldown(
    @Req() req: AuthRequest,
    @Query('periodo') periodo?: string,
    @Query('metric') metric?: string,
    @Query('dimension') dimension?: string,
    @Query('key') key?: string,
  ) {
    return this.relatoriosService.getRelatorioGestao360Drilldown(req.user, periodo, metric, dimension, key);
  }

  @Get('custom')
  async getRelatorioCustom(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Query('campos') campos?: string,
    @Query('filtros') filtros?: string,
    @Query('lgpd') lgpd?: string,
  ) {
    const camposArray = campos ? campos.split(',') : ['nome', 'cpf', 'data_nascimento'];
    const filtrosObj = this.parseFiltros(filtros);
    const lgpdBool = lgpd === 'true';
    return this.relatoriosService.getRelatorioCustom(inicio, fim, camposArray, filtrosObj, lgpdBool);
  }

  @Get('custom/excel')
  async getRelatorioCustomExcel(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Query('campos') campos?: string,
    @Query('filtros') filtros?: string,
    @Query('lgpd') lgpd?: string,
  ) {
    const camposArray = campos ? campos.split(',') : ['nome', 'cpf', 'data_nascimento'];
    const filtrosObj = this.parseFiltros(filtros);
    const lgpdBool = lgpd === 'true';
    const buffer = await this.relatoriosService.getRelatorioCustomExcel(inicio, fim, camposArray, filtrosObj, lgpdBool);
    return buffer;
  }

  @Get('custom/pdf')
  async getRelatorioCustomPDF(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Query('campos') campos?: string,
    @Query('filtros') filtros?: string,
    @Query('lgpd') lgpd?: string,
  ) {
    const camposArray = campos ? campos.split(',') : ['nome', 'cpf', 'data_nascimento'];
    const filtrosObj = this.parseFiltros(filtros);
    const lgpdBool = lgpd === 'true';
    const buffer = await this.relatoriosService.getRelatorioCustomPDF(inicio, fim, camposArray, filtrosObj, lgpdBool);
    return buffer;
  }

  @Get('kpis')
  async getKPIs(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Query('filtros') filtros?: string,
  ) {
    const filtrosObj = this.parseFiltros(filtros);
    return this.relatoriosService.getKPIs(inicio, fim, filtrosObj);
  }

  @Get('estadias')
  async getRelatorioEstadias(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ) {
    return this.relatoriosService.getRelatorioEstadias(inicio, fim);
  }

  @Get('operacional-resumo')
  async getResumoOperacional(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Query('filtros') filtros?: string,
  ) {
    const filtrosObj = this.parseFiltros(filtros);
    return this.relatoriosService.getResumoOperacional(inicio, fim, filtrosObj);
  }

  @Post('dashboards')
  async salvarDashboard(@Body() body: SalvarDashboardDto) {
    return this.relatoriosService.salvarDashboardPersonalizado(body.userId, body.nome, body.config);
  }

  @Get('dashboards')
  async getDashboards(@Query('userId') userId: string) {
    return this.relatoriosService.getDashboardsPersonalizados(userId);
  }

  @Get('graficos')
  async getDadosGraficos(
    @Query('periodo') periodo: 'mes' | 'ano',
    @Query('tipo') tipo: 'barra' | 'linha' | 'pizza',
    @Query('filtros') filtros?: string,
    @Query('quarto') quarto?: string,
    @Query('recortes') recortes?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    const filtrosObj = this.parseFiltros(filtros);
    const recortesArray = recortes ? recortes.split(',') : [];
    return this.relatoriosService.getDadosGraficos(periodo, tipo, filtrosObj, quarto, recortesArray, dataInicio, dataFim);
  }

  private parseFiltros(filtros?: string): Record<string, unknown> {
    if (!filtros?.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(filtros);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new BadRequestException('Filtros precisam ser um objeto JSON válido.');
      }

      return parsed;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Filtros precisam ser um JSON válido.');
    }
  }
}
