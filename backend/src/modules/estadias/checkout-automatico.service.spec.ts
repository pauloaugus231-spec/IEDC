import { CheckoutAutomaticoService } from './checkout-automatico.service';

function createService() {
  const estadiaRepository = {
    query: jest.fn(),
  };
  const estadiasService = {
    checkout: jest.fn().mockResolvedValue({}),
  };

  const service = new CheckoutAutomaticoService(
    estadiaRepository as never,
    estadiasService as never,
  );

  return { service, estadiaRepository, estadiasService };
}

describe('CheckoutAutomaticoService', () => {
  it('faz catch-up no bootstrap quando existem estadias vencidas', async () => {
    const { service, estadiaRepository, estadiasService } = createService();

    estadiaRepository.query.mockResolvedValue([
      {
        estadia_id: 'e1',
        pessoa_id: 'p1',
        status: 'ativa',
        data_limite: new Date('2026-06-24T00:00:00.000Z'),
        pessoa_nome: 'JOCELIO FERREIRA DOS SANTOS',
        data_hoje: '2026-06-24',
        dias_vencidos: 0,
      },
    ]);

    await service.onApplicationBootstrap();

    expect(estadiasService.checkout).toHaveBeenCalledWith(
      'p1',
      'sistema_automatico',
      'Checkout automatico - Estadia vencida em 2026-06-24',
      'automatico',
      expect.any(Date),
    );
  });
});
