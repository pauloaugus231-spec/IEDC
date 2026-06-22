import { CAMAS_OFICIAIS, buildCamasOficiais } from './camas.layout';
import { Casa, PosicaoCama, StatusCama } from '../../entities/cama.entity';

describe('camas.layout', () => {
  it('gera as faixas oficiais de numeracao do albergue', () => {
    expect(CAMAS_OFICIAIS).toEqual([
      { casa: Casa.MASCULINA, inicio: 1, fim: 50 },
      { casa: Casa.IDOSOS, inicio: 51, fim: 66 },
      { casa: Casa.MISTA_MULHERES, inicio: 77, fim: 96 },
      { casa: Casa.LGBT, inicio: 97, fim: 100 },
    ]);
  });

  it('monta as camas com os numeros oficiais e status disponivel', () => {
    const camas = buildCamasOficiais();

    expect(camas).toHaveLength(90);
    expect(camas[0]).toMatchObject({
      numero: 1,
      casa: Casa.MASCULINA,
      posicao: PosicaoCama.SUPERIOR,
      status: StatusCama.DISPONIVEL,
    });
    expect(camas[49]).toMatchObject({ numero: 50, casa: Casa.MASCULINA });
    expect(camas[50]).toMatchObject({ numero: 51, casa: Casa.IDOSOS });
    expect(camas[66]).toMatchObject({ numero: 77, casa: Casa.MISTA_MULHERES });
    expect(camas[89]).toMatchObject({ numero: 100, casa: Casa.LGBT });
  });
});
