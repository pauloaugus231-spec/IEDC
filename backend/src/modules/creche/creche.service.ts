import { Injectable } from '@nestjs/common';
import {
  AcompanhamentoPayload,
  CreateCriancaPayload,
  CriancaTurmaPayload,
  ProfessoraPayload,
  SaveFrequenciaTurmaPayload,
  TurmaProfessoraPayload,
} from './creche-shared';
import { CrecheCadastrosService } from './creche-cadastros.service';
import { CrecheDashboardService } from './creche-dashboard.service';
import { CrecheTurmasService } from './creche-turmas.service';

@Injectable()
export class CrecheService {
  constructor(
    private readonly cadastros: CrecheCadastrosService,
    private readonly dashboard: CrecheDashboardService,
    private readonly turmas: CrecheTurmasService,
  ) {}

  getDashboard(inicio?: string, fim?: string, escopo?: string) {
    return this.dashboard.getDashboard(inicio, fim, escopo);
  }

  getAfericao(inicio?: string, fim?: string) {
    return this.turmas.getAfericao(inicio, fim);
  }

  getTurmas() {
    return this.turmas.getTurmas();
  }

  getTurmaDetalhe(id: string) {
    return this.turmas.getTurmaDetalhe(id);
  }

  updateTurmaProfessora(id: string, body: TurmaProfessoraPayload) {
    return this.turmas.updateTurmaProfessora(id, body);
  }

  getProfessoras() {
    return this.turmas.getProfessoras();
  }

  createProfessora(body: ProfessoraPayload) {
    return this.turmas.createProfessora(body);
  }

  updateProfessora(id: string, body: ProfessoraPayload) {
    return this.turmas.updateProfessora(id, body);
  }

  getCriancas(filters?: { search?: string; turmaId?: string; status?: string }) {
    return this.cadastros.getCriancas(filters);
  }

  createCrianca(body: CreateCriancaPayload) {
    return this.cadastros.createCrianca(body);
  }

  getCriancaDetalhe(codigo: string) {
    return this.cadastros.getCriancaDetalhe(codigo);
  }

  updateCriancaTurma(codigo: string, body: CriancaTurmaPayload) {
    return this.cadastros.updateCriancaTurma(codigo, body);
  }

  createAcompanhamento(codigo: string, body: AcompanhamentoPayload) {
    return this.cadastros.createAcompanhamento(codigo, body);
  }

  getFrequenciaTurma(turmaId: string, data: string) {
    return this.turmas.getFrequenciaTurma(turmaId, data);
  }

  saveFrequenciaTurma(body: SaveFrequenciaTurmaPayload) {
    return this.turmas.saveFrequenciaTurma(body);
  }
}
