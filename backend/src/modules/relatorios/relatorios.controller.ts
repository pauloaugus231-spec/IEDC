import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('custom')
  async getRelatorioCustom(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
    @Query('campos') campos?: string,
    @Query('filtros') filtros?: string,
    @Query('lgpd') lgpd?: string,
  ) {
    const camposArray = campos ? campos.split(',') : ['nome', 'cpf', 'data_nascimento'];
    const filtrosObj = filtros ? JSON.parse(filtros) : {};
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
    const filtrosObj = filtros ? JSON.parse(filtros) : {};
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
    const filtrosObj = filtros ? JSON.parse(filtros) : {};
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
    const filtrosObj = filtros ? JSON.parse(filtros) : {};
    return this.relatoriosService.getKPIs(inicio, fim, filtrosObj);
  }

  @Get('estadias')
  async getRelatorioEstadias(
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ) {
    return this.relatoriosService.getRelatorioEstadias(inicio, fim);
  }

  @Post('dashboards')
  async salvarDashboard(@Body() body: { userId: string; nome: string; config: any }) {
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
    const filtrosObj = filtros ? JSON.parse(filtros) : {};
    const recortesArray = recortes ? recortes.split(',') : [];
    return this.relatoriosService.getDadosGraficos(periodo, tipo, filtrosObj, quarto, recortesArray, dataInicio, dataFim);
  }
}
