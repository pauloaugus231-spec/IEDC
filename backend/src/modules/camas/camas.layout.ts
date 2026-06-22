import { Casa, PosicaoCama, StatusCama, type Cama } from '../../entities/cama.entity';

export interface CamaRange {
  casa: Casa;
  inicio: number;
  fim: number;
}

export const CAMAS_OFICIAIS: readonly CamaRange[] = [
  { casa: Casa.MASCULINA, inicio: 1, fim: 50 },
  { casa: Casa.IDOSOS, inicio: 51, fim: 66 },
  { casa: Casa.MISTA_MULHERES, inicio: 77, fim: 96 },
  { casa: Casa.LGBT, inicio: 97, fim: 100 },
];

export function buildCamasOficiais(): Partial<Cama>[] {
  return CAMAS_OFICIAIS.flatMap(({ casa, inicio, fim }) =>
    Array.from({ length: fim - inicio + 1 }, (_, index) => {
      const numero = inicio + index;

      return {
        numero,
        casa,
        posicao: numero % 2 === 0 ? PosicaoCama.INFERIOR : PosicaoCama.SUPERIOR,
        status: StatusCama.DISPONIVEL,
      };
    }),
  );
}
