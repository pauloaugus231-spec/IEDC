import { NotFoundException, ConflictException } from '@nestjs/common';
import { EstadiasService } from './estadias.service';

// ── Helpers ─────────────────────────────────────────

function createMockTransactionalManager() {
  const store: Record<string, Record<string, unknown>> = {};

  return {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation(async (entity: unknown) => entity),
  };
}

function createMockRepo(transactionalManager: ReturnType<typeof createMockTransactionalManager>) {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data: Record<string, unknown>) => ({
      id: 'new-estadia-id',
      ...data,
    })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    manager: {
      transaction: jest.fn().mockImplementation(async (cb: (em: unknown) => Promise<unknown>) => cb(transactionalManager)),
    },
  };
}

function createService() {
  const txManager = createMockTransactionalManager();
  const estadiaRepo = createMockRepo(txManager);
  const camaRepo = { findOne: jest.fn() };
  const pessoaRepo = { findOne: jest.fn() };
  const dashboardService = { getOcupacao: jest.fn().mockResolvedValue({}) };
  const wsGateway = { server: { emit: jest.fn() } };

  const service = new EstadiasService(
    estadiaRepo as never,
    camaRepo as never,
    pessoaRepo as never,
    dashboardService as never,
    wsGateway as never,
  );

  return { service, txManager, estadiaRepo, camaRepo, pessoaRepo };
}

// ── Tests ───────────────────────────────────────────

describe('EstadiasService — regras de negócio', () => {
  it('checkin rejeita se pessoa não for encontrada', async () => {
    const { service, txManager } = createService();
    txManager.findOne.mockResolvedValue(null);

    await expect(
      service.checkin({ pessoa_id: 'p1', cama_id: 'c1', funcionario: 'edu' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('checkin rejeita se pessoa já tem estadia ativa', async () => {
    const { service, txManager } = createService();

    // Primeira chamada → encontra a pessoa
    txManager.findOne.mockResolvedValueOnce({
      id: 'p1',
      nome: 'João',
      status_cadastro: 'inativo',
    });
    // Segunda chamada → encontra estadia ativa
    txManager.findOne.mockResolvedValueOnce({
      id: 'e1',
      status: 'ativa',
      data_checkin: new Date(),
    });

    await expect(
      service.checkin({ pessoa_id: 'p1', cama_id: 'c1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('checkin rejeita se cama não está disponível', async () => {
    const { service, txManager } = createService();

    // Pessoa encontrada
    txManager.findOne.mockResolvedValueOnce({ id: 'p1', nome: 'Maria' });
    // Sem estadia ativa
    txManager.findOne.mockResolvedValueOnce(null);
    // Sem estadia anterior (regra de retorno)
    txManager.findOne.mockResolvedValueOnce(null);
    // Cama encontrada mas ocupada
    txManager.findOne.mockResolvedValueOnce({
      id: 'c1',
      numero: 5,
      casa: 'MASCULINA',
      status: 'OCUPADA',
    });

    await expect(
      service.checkin({ pessoa_id: 'p1', cama_id: 'c1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('checkout rejeita se não há estadia ativa para a pessoa', async () => {
    const { service, txManager } = createService();
    txManager.findOne.mockResolvedValue(null);

    await expect(
      service.checkout('p-inexistente'),
    ).rejects.toThrow(NotFoundException);
  });

  it('prorrogação rejeita estadia não ativa', async () => {
    const { service, estadiaRepo } = createService();
    estadiaRepo.findOne.mockResolvedValue({
      id: 'e1',
      status: 'finalizada',
      data_limite: new Date(),
    });

    await expect(
      service.prorrogacao('e1', 7, 'Motivo social'),
    ).rejects.toThrow(ConflictException);
  });
});
