// Mapeamento centralizado entre chave backend (casa) e label de quarto.
// Usado em PresencasPage, TrocaModal e qualquer outro ponto que precise
// exibir ou converter esses valores.

export type CasaKey = 'MASCULINA' | 'MISTA_MULHERES' | 'IDOSOS' | 'LGBT';
export type QuartoLabel = 'Masculino' | 'Feminino' | 'Idosos' | 'LGBT+';

/** Opções para selects — valor = chave backend, label = nome de exibição */
export const CASA_OPTIONS: { value: CasaKey; label: string }[] = [
  { value: 'MASCULINA',      label: 'Quarto Masculino' },
  { value: 'MISTA_MULHERES', label: 'Quarto Feminino' },
  { value: 'IDOSOS',         label: 'Quarto Idosos' },
  { value: 'LGBT',           label: 'Quarto LGBT+' },
];

/** Chave backend → label curto (ex.: "Masculino") */
export const CASA_LABELS: Record<CasaKey, QuartoLabel> = {
  MASCULINA:      'Masculino',
  MISTA_MULHERES: 'Feminino',
  IDOSOS:         'Idosos',
  LGBT:           'LGBT+',
};

/** Label de quarto → chave backend */
export const QUARTO_PARA_CASA: Record<QuartoLabel, CasaKey> = {
  Masculino: 'MASCULINA',
  Feminino:  'MISTA_MULHERES',
  Idosos:    'IDOSOS',
  'LGBT+':   'LGBT',
};

/** Retorna o label curto de uma chave backend; cai de volta no próprio valor. */
export function getCasaLabel(casa: string): string {
  return (CASA_LABELS as Record<string, string>)[casa] ?? casa;
}
