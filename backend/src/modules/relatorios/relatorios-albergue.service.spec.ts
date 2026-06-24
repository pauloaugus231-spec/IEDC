import { RelatoriosAlbergueService } from './relatorios-albergue.service';

function createQueryBuilderMock() {
  const qb: Record<string, jest.Mock> = {};
  const chainMethods = [
    'select',
    'where',
    'innerJoin',
    'andWhere',
    'distinct',
    'orderBy',
    'leftJoinAndSelect',
  ] as const;

  for (const method of chainMethods) {
    qb[method] = jest.fn().mockReturnThis();
  }

  qb.getRawMany = jest.fn().mockResolvedValue([]);
  return qb;
}

describe('RelatoriosAlbergueService', () => {
  it('getRelatorioCustom ordena por alias nome quando o campo é solicitado', async () => {
    const qb = createQueryBuilderMock();
    const pessoaRepository = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const estadiaRepository = { createQueryBuilder: jest.fn() };
    const service = new RelatoriosAlbergueService({} as never, pessoaRepository as never, estadiaRepository as never);

    await service.getRelatorioCustom(undefined, undefined, ['nome']);

    expect(qb.orderBy).toHaveBeenCalledWith('nome', 'ASC');
  });

  it('getRelatorioEstadias ordena por alias pessoa_nome', async () => {
    const qb = createQueryBuilderMock();
    const pessoaRepository = { createQueryBuilder: jest.fn() };
    const estadiaRepository = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const service = new RelatoriosAlbergueService({} as never, pessoaRepository as never, estadiaRepository as never);

    await service.getRelatorioEstadias();

    expect(qb.orderBy).toHaveBeenCalledWith('pessoa_nome', 'ASC');
  });
});
