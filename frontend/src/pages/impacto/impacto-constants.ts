import type { CreateImpactoAlberguePayload, ImpactoSocialPeriodo } from '../../api';

export const periodos: { label: string; value: ImpactoSocialPeriodo }[] = [
  { label: 'Mês', value: 'mes' },
  { label: 'Trimestre', value: 'trimestre' },
  { label: 'Ano', value: 'ano' },
  { label: 'Tudo', value: 'todos' },
];

export const situacaoTerritorialOptions = [
  'Situação de rua',
  'Pessoa em trânsito',
  'Migrante',
  'Migrante em situação de rua',
  'Imigrante',
  'Imigrante em situação de rua',
  'Ñ informado',
  'Prefiro ñ responder',
] as const;

export const tempoSemMoradiaOptions = [
  'Menos de 7 dias',
  'Entre 1 semana e 1 mês',
  'Entre 1 e 6 meses',
  'Entre 6 meses e 1 ano',
  'Entre 1 e 3 anos',
  'Mais de 3 anos',
  'Mais de 10 anos',
  'Vivo essa situação de forma intermitente, com idas e vindas',
  'Prefiro não responder',
] as const;

export const fatoresOptions = [
  'Perda de trabalho ou renda',
  'Dificuldade para pagar aluguel ou moradia',
  'Rompimento ou conflito familiar',
  'Separação conjugal',
  'Violência doméstica ou familiar',
  'Problemas de saúde',
  'Sofrimento psíquico ou saúde mental',
  'Uso problemático de álcool ou outras substâncias',
  'Migração ou chegada recente à cidade sem rede de apoio',
  'Saída de hospital, abrigo, prisão ou outra instituição',
  'Perda de documentos',
  'Enchente, desastre ou perda da moradia',
  'Escolha não falar sobre isso agora',
  'Outro',
] as const;

export const ajudaOptions = [
  'Proteção/pernoite',
  'Descanso/segurança',
  'Alimentação',
  'Higiene/vestuário',
  'Escuta/vínculo',
  'Orientação',
  'Possibilidade de refletir',
  'Oficina/atividade',
  'Outro',
] as const;

export const proximoPassoOptions = [
  'Saúde',
  'Documentação',
  'Benefício/CadÚnico',
  'Trabalho/renda',
  'Família/rede de apoio',
  'Moradia/acolhimento',
  'Proteção/segurança',
  'Educação',
  'Nenhum agora',
  'Outro',
] as const;

export const demandasEquipeOptions = [
  'Saúde',
  'Saúde mental',
  'Documentação',
  'Benefícios/CadÚnico',
  'Trabalho/renda',
  'Moradia/acolhimento',
  'Família/rede de apoio',
  'Segurança/proteção',
  'Higiene/vestuário',
  'Escuta/vínculo',
  'Violência',
  'Uso problemático de álcool/outras substâncias',
  'Migração/trânsito',
  'Jurídico/Defensoria',
  'Educação',
  'Oficina/atividade',
  'Apenas proteção/pernoite imediato',
  'Outro',
] as const;

export const acaoEquipeOptions = [
  'Escuta',
  'Orientação',
  'Encaminhamento sugerido',
  'Encaminhamento aceito',
  'Retorno/acompanhamento necessário',
  'Apenas acolhimento imediato',
] as const;

export const respostaOptions = ['Sim', 'Em parte', 'Não', 'Prefiro não responder'] as const;
export const comunicacaoOptions = ['Sim', 'Em parte', 'Não', 'Não se aplica'] as const;
export const proximoPassoAjudaOptions = ['Sim', 'Em parte', 'Não', 'Ainda não'] as const;
export const oficinaOptions = ['Sim', 'Não', 'Ainda não, mas tenho interesse', 'Não tenho interesse no momento'] as const;

export const initialForm: CreateImpactoAlberguePayload = {
  dataReferencia: new Date().toISOString().slice(0, 10),
  situacaoTerritorial: 'Situação de rua',
  tempoSemMoradia: 'Prefiro não responder',
  fatoresSemMoradia: [],
  fatoresSemMoradiaOutro: '',
  ajudaPrincipal: [],
  ajudaPrincipalOutro: '',
  respeitoUsuarios: 'Prefiro não responder',
  comunicacaoEquipe: 'Não se aplica',
  proximoPassoAjuda: 'Ainda não',
  proximosPassos: [],
  proximoPassoOutro: '',
  participouOficina: 'Não',
  relatoRepresenta: '',
  melhoriaSugerida: '',
  demandasEquipe: [],
  demandaOutro: '',
  acaoEquipe: [],
  preenchidoPor: '',
  perfilPreenchedor: '',
};

export function toggleArray(value: string, list: string[]) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
