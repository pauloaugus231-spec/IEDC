import { PessoasService } from './pessoas.service';

function createQueryBuilderMock() {
  const qb: Record<string, jest.Mock> = {};
  const chainMethods = [
    'leftJoinAndSelect',
    'addSelect',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
  ] as const;

  for (const method of chainMethods) {
    qb[method] = jest.fn().mockReturnThis();
  }

  qb.getCount = jest.fn().mockResolvedValue(0);
  qb.getMany = jest.fn().mockResolvedValue([]);
  return qb;
}

function createService() {
  const qb = createQueryBuilderMock();
  const pessoaRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  };
  const bloqueioRepository = { find: jest.fn(), save: jest.fn() };
  const ocorrenciaRepository = { create: jest.fn(), save: jest.fn() };

  const service = new PessoasService(
    pessoaRepository as never,
    bloqueioRepository as never,
    ocorrenciaRepository as never,
  );

  return { service, qb };
}

describe('PessoasService', () => {
  it('findAll ordena por nome exibicao em vez de expressao raw', async () => {
    const { service, qb } = createService();

    await service.findAll(1, 24, 'mara');

    expect(qb.addSelect).toHaveBeenCalledWith(
      "COALESCE(NULLIF(BTRIM(pessoa.nome_social), ''), pessoa.nome)",
      'nome_exibicao',
    );
    expect(qb.orderBy).toHaveBeenCalledWith('nome_exibicao', 'ASC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('pessoa.created_at', 'DESC');
  });

  it('search também usa nome exibicao para ordenação', async () => {
    const { service, qb } = createService();

    await service.search('maria');

    expect(qb.addSelect).toHaveBeenCalledWith(
      "COALESCE(NULLIF(BTRIM(pessoa.nome_social), ''), pessoa.nome)",
      'nome_exibicao',
    );
    expect(qb.orderBy).toHaveBeenCalledWith('nome_exibicao', 'ASC');
  });
});
