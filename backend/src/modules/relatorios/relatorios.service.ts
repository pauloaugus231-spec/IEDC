import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../auth/auth.types';
import {
  RelatorioExecutivoResponse,
  RelatorioFiltros,
  RelatorioGestao360DrilldownResponse,
  RelatorioGestao360Response,
} from './relatorios-shared';
import { RelatoriosAlbergueService } from './relatorios-albergue.service';
import { RelatoriosGestao360Service } from './relatorios-gestao360.service';
import { RelatoriosImpactoService } from './relatorios-impacto.service';

export type { RelatorioExecutivoEscopo, RelatorioFiltros } from './relatorios-shared';

@Injectable()
export class RelatoriosService {
  constructor(
    private readonly albergue: RelatoriosAlbergueService,
    private readonly impacto: RelatoriosImpactoService,
    private readonly gestao360: RelatoriosGestao360Service,
  ) {}

  getRelatorioExecutivo(
    actor: AuthUser | undefined,
    escopo?: string,
    periodo?: string,
  ): Promise<RelatorioExecutivoResponse> {
    return this.impacto.getRelatorioExecutivo(actor, escopo, periodo);
  }

  getRelatorioGestao360(
    actor: AuthUser | undefined,
    periodo?: string,
    metricId?: string,
    dimensionId?: string,
    chartType?: string,
  ): Promise<RelatorioGestao360Response> {
    return this.gestao360.getRelatorioGestao360(actor, periodo, metricId, dimensionId, chartType);
  }

  getRelatorioGestao360Drilldown(
    actor: AuthUser | undefined,
    periodo?: string,
    metricId?: string,
    dimensionId?: string,
    key?: string,
  ): Promise<RelatorioGestao360DrilldownResponse> {
    return this.gestao360.getRelatorioGestao360Drilldown(actor, periodo, metricId, dimensionId, key);
  }

  getRelatorioCustom(inicio?: string, fim?: string, campos: string[] = [], filtros: RelatorioFiltros = {}, lgpd: boolean = false) {
    return this.albergue.getRelatorioCustom(inicio, fim, campos, filtros, lgpd);
  }

  getRelatorioCustomExcel(inicio?: string, fim?: string, campos: string[] = [], filtros: RelatorioFiltros = {}, lgpd: boolean = false) {
    return this.albergue.getRelatorioCustomExcel(inicio, fim, campos, filtros, lgpd);
  }

  getRelatorioCustomPDF(inicio?: string, fim?: string, campos: string[] = [], filtros: RelatorioFiltros = {}, lgpd: boolean = false) {
    return this.albergue.getRelatorioCustomPDF(inicio, fim, campos, filtros, lgpd);
  }

  getKPIs(inicio?: string, fim?: string, filtros: RelatorioFiltros = {}) {
    return this.albergue.getKPIs(inicio, fim, filtros);
  }

  getRelatorioEstadias(inicio?: string, fim?: string) {
    return this.albergue.getRelatorioEstadias(inicio, fim);
  }

  getResumoOperacional(inicio?: string, fim?: string, filtros: RelatorioFiltros = {}) {
    return this.albergue.getResumoOperacional(inicio, fim, filtros);
  }

  salvarDashboardPersonalizado(userId: string, nome: string, config: unknown) {
    return this.albergue.salvarDashboardPersonalizado(userId, nome, config);
  }

  getDashboardsPersonalizados(userId: string) {
    return this.albergue.getDashboardsPersonalizados(userId);
  }

  getDadosGraficos(periodo: 'mes' | 'ano', tipo: 'barra' | 'linha' | 'pizza', filtros: RelatorioFiltros = {}, quarto?: string, recortes: string[] = [], dataInicio?: string, dataFim?: string) {
    return this.albergue.getDadosGraficos(periodo, tipo, filtros, quarto, recortes, dataInicio, dataFim);
  }
}
