import { ForbiddenException } from '@nestjs/common';
import { LojasController } from './lojas.controller';
import { UsuarioRole } from '../../entities/usuario.entity';
import type { AuthUser, AuthRequest } from '../../auth/auth.types';

// ── Helpers ─────────────────────────────────────────

function stubUser(role: UsuarioRole): AuthUser {
  return {
    id: 'u1',
    uuid: 'u1-uuid',
    login: 'test',
    name: 'Test',
    displayName: 'Test',
    role,
    roleLabel: role,
    service: 'gestao' as AuthUser['service'],
    serviceLabel: 'Gestão',
    homePath: '/gestao',
    mustChangePassword: false,
  };
}

function stubRequest(role: UsuarioRole): AuthRequest {
  return { user: stubUser(role) } as unknown as AuthRequest;
}

function createController() {
  const lojasService = {
    getDashboard: jest.fn().mockResolvedValue({}),
    getComandas: jest.fn().mockResolvedValue([
      { id: 'c1', status: 'paga', total: 150, pago: 150, saldo: 0, totalLoja: 80 },
      { id: 'c2', status: 'aberta', total: 200, pago: 0, saldo: 200, totalLoja: 120 },
    ]),
    getProdutos: jest.fn().mockResolvedValue([]),
    getRetiradas: jest.fn().mockResolvedValue([
      { id: 'r1', total: 95, status: 'aguardando_retirada' },
    ]),
  };

  const caixaService = {
    getCaixaAtual: jest.fn().mockResolvedValue(null),
  };

  const controller = new LojasController(
    lojasService as never,
    caixaService as never,
  );

  return { controller, lojasService };
}

// ── Tests ───────────────────────────────────────────

describe('LojasController — controle de acesso e mascaramento', () => {
  it('gestora pode acessar produtos de qualquer loja', async () => {
    const { controller, lojasService } = createController();
    const req = stubRequest(UsuarioRole.GESTORA);

    await controller.getProdutos(req, 'bazar');

    expect(lojasService.getProdutos).toHaveBeenCalledWith('bazar');
  });

  it('loja_bazar é restrita ao seu próprio slug', async () => {
    const { controller, lojasService } = createController();
    const req = stubRequest(UsuarioRole.LOJA_BAZAR);

    await controller.getProdutos(req);

    expect(lojasService.getProdutos).toHaveBeenCalledWith('bazar');
  });

  it('loja_bazar não pode acessar slug de outra loja', () => {
    const { controller } = createController();
    const req = stubRequest(UsuarioRole.LOJA_BAZAR);

    expect(() => controller.getProdutos(req, 'brecho')).toThrow(ForbiddenException);
  });

  it('loja_brecho vê comandas com valores mascarados (total=0)', async () => {
    const { controller } = createController();
    const req = stubRequest(UsuarioRole.LOJA_BRECHO);

    const comandas = await controller.getComandas(req, undefined, 'brecho');

    expect(comandas).toHaveLength(2);
    expect(comandas[0].total).toBe(0);
    expect(comandas[0].pago).toBe(0);
    expect(comandas[0].saldo).toBe(0);
    expect(comandas[0].totalLoja).toBe(0);
  });

  it('gestora vê comandas com valores reais (não mascarados)', async () => {
    const { controller } = createController();
    const req = stubRequest(UsuarioRole.GESTORA);

    const comandas = await controller.getComandas(req, undefined, 'bazar');

    expect(comandas[0].total).toBe(150);
    expect(comandas[0].pago).toBe(150);
  });

  it('loja_feirao vê retiradas com total mascarado', async () => {
    const { controller } = createController();
    const req = stubRequest(UsuarioRole.LOJA_FEIRAO);

    const retiradas = await controller.getRetiradas(req, 'feirao');

    expect(retiradas).toHaveLength(1);
    expect(retiradas[0].total).toBe(0);
  });

  it('comercial vê retiradas com valores reais', async () => {
    const { controller } = createController();
    const req = stubRequest(UsuarioRole.COMERCIAL);

    const retiradas = await controller.getRetiradas(req);

    expect(retiradas[0].total).toBe(95);
  });

  it('loja_bazar não pode acessar histórico financeiro por período', () => {
    const { controller } = createController();
    const req = stubRequest(UsuarioRole.LOJA_BAZAR);

    expect(() => controller.getComandas(req, 'recentes', 'bazar')).toThrow(ForbiddenException);
  });
});
