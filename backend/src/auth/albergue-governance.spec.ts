import 'reflect-metadata';
import { ROLES_KEY } from './roles.decorator';
import {
  ALBERGUE_COORDINATION_ROLES,
  ALBERGUE_DATA_QUALITY_ROLES,
  ALBERGUE_MANAGEMENT_READ_ROLES,
  ALBERGUE_OPERATION_ROLES,
  ALBERGUE_OPERATIONAL_READ_ROLES,
  ALBERGUE_READ_ROLES,
} from './albergue-roles';
import { UsuarioRole } from '../entities/usuario.entity';
import { PessoasController } from '../modules/pessoas/pessoas.controller';
import { EstadiasController } from '../modules/estadias/estadias.controller';
import { OcorrenciasController } from '../modules/ocorrencias/ocorrencias.controller';
import { BloqueiosController } from '../modules/bloqueios/bloqueios.controller';
import { SolicitacoesController } from '../modules/solicitacoes/solicitacoes.controller';
import { TriagemController } from '../modules/triagem/triagem.controller';
import { ImpactoSocialController } from '../modules/impacto-social/impacto-social.controller';
import { DashboardController } from '../modules/dashboard/dashboard.controller';
import { CamasController } from '../modules/camas/camas.controller';
import { RelatoriosController } from '../modules/relatorios/relatorios.controller';
import { RmaController } from '../modules/rma/rma.controller';
import { QualidadeDadosController } from '../modules/qualidade-dados/qualidade-dados.controller';
import { ColaboradoresController } from '../modules/colaboradores/colaboradores.controller';
import { EscalaController } from '../modules/escala/escala.controller';
import { RegrasEscalaController } from '../modules/regras-escala/regras-escala.controller';
import { TurnosController } from '../modules/turnos/turnos.controller';
import { PlantoesController } from '../modules/plantoes/plantoes.controller';
import { CrecheController } from '../modules/creche/creche.controller';
import { LojasController } from '../modules/lojas/lojas.controller';

function rolesOf(controller: any, method?: string): UsuarioRole[] {
  if (method) {
    const handlerRoles = Reflect.getMetadata(ROLES_KEY, controller.prototype[method]) as UsuarioRole[] | undefined;
    if (handlerRoles) return handlerRoles;
  }

  return (Reflect.getMetadata(ROLES_KEY, controller) as UsuarioRole[] | undefined) ?? [];
}

function expectSameRoles(actual: UsuarioRole[], expected: readonly UsuarioRole[]) {
  expect(new Set(actual)).toEqual(new Set(expected));
}

describe('governança de acesso do Albergue', () => {
  it('mantém papéis distintos e remove a equipe técnica global', () => {
    const values = Object.values(UsuarioRole) as string[];

    expect(values).not.toContain('equipe_tecnica');
    expect(values).toEqual(expect.arrayContaining([
      'equipe_tecnica_albergue',
      'auxiliar_coordenacao_albergue',
      'diretor_albergue',
    ]));
  });

  it('aplica a matriz de menor privilégio aos grupos centrais', () => {
    expect(ALBERGUE_OPERATION_ROLES).not.toContain(UsuarioRole.DIRETOR_ALBERGUE);
    expect(ALBERGUE_OPERATIONAL_READ_ROLES).not.toContain(UsuarioRole.DIRETOR_ALBERGUE);
    expect(ALBERGUE_OPERATION_ROLES).not.toContain(UsuarioRole.EQUIPE_TECNICA_ALBERGUE);
    expect(ALBERGUE_COORDINATION_ROLES).not.toContain(UsuarioRole.EDUCADOR_ALBERGUE);
    expect(ALBERGUE_MANAGEMENT_READ_ROLES).not.toContain(UsuarioRole.EDUCADOR_ALBERGUE);
    expect(ALBERGUE_MANAGEMENT_READ_ROLES).not.toContain(UsuarioRole.EQUIPE_TECNICA_ALBERGUE);
    expect(ALBERGUE_DATA_QUALITY_ROLES).toContain(UsuarioRole.EQUIPE_TECNICA_ALBERGUE);
  });

  it('protege leitura e mutações de pessoas', () => {
    expectSameRoles(rolesOf(PessoasController, 'findAll'), ALBERGUE_OPERATIONAL_READ_ROLES);
    expectSameRoles(rolesOf(PessoasController, 'create'), ALBERGUE_OPERATION_ROLES);
    expectSameRoles(rolesOf(PessoasController, 'update'), ALBERGUE_OPERATION_ROLES);
    expectSameRoles(rolesOf(PessoasController, 'updatePresenca'), ALBERGUE_OPERATION_ROLES);
    expectSameRoles(rolesOf(PessoasController, 'liberarAntecipadamente'), ALBERGUE_COORDINATION_ROLES);
    expectSameRoles(rolesOf(PessoasController, 'remove'), ALBERGUE_COORDINATION_ROLES);
  });

  it('protege o ciclo completo das estadias', () => {
    expectSameRoles(rolesOf(EstadiasController, 'getByPessoa'), ALBERGUE_OPERATIONAL_READ_ROLES);
    for (const method of ['checkin', 'checkout', 'registrarAbandono', 'prorrogacao', 'trocarCama']) {
      expectSameRoles(rolesOf(EstadiasController, method), ALBERGUE_OPERATION_ROLES);
    }
    for (const method of ['forcarCheckoutAutomatico', 'diagnosticarCheckout', 'forcarCheckoutPorPessoa', 'corrigirDuplicacoes', 'diagnosticarCamas']) {
      expectSameRoles(rolesOf(EstadiasController, method), ALBERGUE_COORDINATION_ROLES);
    }
  });

  it('permite registro operacional sem liberar edição e exclusão de ocorrências', () => {
    expectSameRoles(rolesOf(OcorrenciasController, 'findAll'), ALBERGUE_OPERATIONAL_READ_ROLES);
    expectSameRoles(rolesOf(OcorrenciasController, 'create'), ALBERGUE_OPERATION_ROLES);
    expectSameRoles(rolesOf(OcorrenciasController, 'update'), ALBERGUE_COORDINATION_ROLES);
    expectSameRoles(rolesOf(OcorrenciasController, 'remove'), ALBERGUE_COORDINATION_ROLES);
  });

  it('reserva bloqueios e exclusões para coordenação', () => {
    expectSameRoles(rolesOf(BloqueiosController, 'findAllAtivos'), ALBERGUE_OPERATIONAL_READ_ROLES);
    expectSameRoles(rolesOf(BloqueiosController, 'criar'), ALBERGUE_COORDINATION_ROLES);
    expectSameRoles(rolesOf(BloqueiosController, 'liberarAntecipadamente'), ALBERGUE_COORDINATION_ROLES);
    expectSameRoles(rolesOf(SolicitacoesController, 'remove'), ALBERGUE_COORDINATION_ROLES);
  });

  it('separa rotina, leitura gerencial e administração do setor', () => {
    expectSameRoles(rolesOf(DashboardController), ALBERGUE_READ_ROLES);
    expectSameRoles(rolesOf(CamasController), ALBERGUE_OPERATIONAL_READ_ROLES);
    expectSameRoles(rolesOf(TriagemController, 'encerrar'), ALBERGUE_OPERATION_ROLES);
    expectSameRoles(rolesOf(ImpactoSocialController, 'getDashboard'), ALBERGUE_READ_ROLES);
    expectSameRoles(rolesOf(ImpactoSocialController, 'createResposta'), ALBERGUE_OPERATION_ROLES);
    expectSameRoles(rolesOf(RelatoriosController), ALBERGUE_MANAGEMENT_READ_ROLES);
    expectSameRoles(rolesOf(RelatoriosController, 'salvarDashboard'), ALBERGUE_COORDINATION_ROLES);
    expectSameRoles(rolesOf(RmaController), ALBERGUE_COORDINATION_ROLES);
  });

  it('reserva cadastros internos e escala para coordenador e auxiliar', () => {
    for (const controller of [ColaboradoresController, EscalaController, RegrasEscalaController, TurnosController, PlantoesController]) {
      expectSameRoles(rolesOf(controller), ALBERGUE_COORDINATION_ROLES);
    }
  });

  it('mantém Escola e Comercial isolados dos papéis do Albergue', () => {
    const scopedAlbergueRoles = ALBERGUE_READ_ROLES.filter((role) => role !== UsuarioRole.GESTORA);

    for (const role of scopedAlbergueRoles) {
      expect(rolesOf(CrecheController)).not.toContain(role);
      expect(rolesOf(LojasController)).not.toContain(role);
    }
    expect(rolesOf(QualidadeDadosController)).not.toContain(UsuarioRole.DIRETOR_ALBERGUE);
    expect(rolesOf(QualidadeDadosController)).not.toContain(UsuarioRole.EDUCADOR_ALBERGUE);
  });
});
