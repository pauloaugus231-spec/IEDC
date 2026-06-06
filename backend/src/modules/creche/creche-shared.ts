export interface CrecheResponsavelPayload {
  nome?: string;
  parentesco?: string;
  cpf?: string;
  rg?: string;
  telefone?: string;
  telefoneAlternativo?: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  trabalho?: string;
  responsavelPrincipal?: boolean;
  autorizadoRetirada?: boolean;
  observacoes?: string;
}

export interface CreateCriancaPayload {
  codigo?: string;
  nome?: string;
  cpf?: string;
  rg?: string;
  nis?: string;
  dataNascimento?: string;
  dataIngresso?: string;
  turmaId?: string;
  status?: string;
  sexo?: string;
  genero?: string;
  racaCor?: string;
  naturalidade?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  escolaOrigem?: string;
  alergias?: string;
  condicoesSaude?: string;
  medicamentos?: string;
  autorizacaoImagem?: boolean;
  observacoes?: string;
  responsaveis?: CrecheResponsavelPayload[];
  responsavel?: CrecheResponsavelPayload;
}

export interface FrequenciaRegistroPayload {
  criancaId?: string;
  presente?: boolean;
  justificativa?: string;
}

export interface SaveFrequenciaTurmaPayload {
  turmaId?: string;
  data?: string;
  registros?: FrequenciaRegistroPayload[];
  registradoPor?: string;
}

export interface AcompanhamentoPayload {
  tipo?: string;
  status?: string;
  descricao?: string;
  responsavel?: string;
  data?: string;
}

export interface ProfessoraPayload {
  nome?: string;
  telefone?: string;
  email?: string;
  funcao?: string;
  status?: string;
  observacoes?: string;
}

export interface TurmaProfessoraPayload {
  professoraId?: string | null;
}

export interface CriancaTurmaPayload {
  turmaId?: string;
}

export const EEI_TURMAS = [
  { nome: 'Berçário 1', faixaEtaria: '0 a 1 ano', turno: 'Integral', capacidade: 10, professora: 'Ana Paula Martins' },
  { nome: 'Berçário 2', faixaEtaria: '1 a 2 anos', turno: 'Integral', capacidade: 12, professora: 'Luciana Ribeiro' },
  { nome: 'Maternal 1', faixaEtaria: '2 a 3 anos', turno: 'Integral', capacidade: 14, professora: 'Fernanda Costa' },
  { nome: 'Maternal 2', faixaEtaria: '3 anos', turno: 'Integral', capacidade: 14, professora: 'Mariana Santos' },
  { nome: 'Jardim A', faixaEtaria: '4 anos', turno: 'Integral', capacidade: 16, professora: 'Patrícia Almeida' },
  { nome: 'Jardim A2', faixaEtaria: '4 anos', turno: 'Integral', capacidade: 16, professora: 'Camila Oliveira' },
  { nome: 'Jardim B', faixaEtaria: '5 anos', turno: 'Integral', capacidade: 18, professora: 'Roberta Nunes' },
  { nome: 'Jardim B2', faixaEtaria: '5 anos', turno: 'Integral', capacidade: 18, professora: 'Juliana Ferreira' },
] as const;

export const EEI_FUNCOES_PROFISSIONAIS = [
  'Regente',
  'Volante',
  'Técnica em desenvolvimento infantil',
  'Estagiária',
  'Temporária',
  'Substituta',
];

export const EEI_TURMA_ORDER_SQL = `
  CASE t.nome
    WHEN 'Berçário 1' THEN 1
    WHEN 'Berçário 2' THEN 2
    WHEN 'Maternal 1' THEN 3
    WHEN 'Maternal 2' THEN 4
    WHEN 'Jardim A' THEN 5
    WHEN 'Jardim A2' THEN 6
    WHEN 'Jardim B' THEN 7
    WHEN 'Jardim B2' THEN 8
    ELSE 99
  END
`;

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeriodoMes(inicio?: string, fim?: string) {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  return {
    inicio: inicio || primeiroDia.toISOString().slice(0, 10),
    fim: fim || ultimoDia.toISOString().slice(0, 10),
  };
}

export function getPeriodoPorEscopo(referencia: Date, escopo?: string) {
  if (escopo === 'semana') {
    const inicio = new Date(referencia);
    inicio.setDate(referencia.getDate() - 6);
    return {
      inicio: formatDate(inicio),
      fim: formatDate(referencia),
    };
  }

  if (escopo === 'trimestre') {
    const inicio = new Date(referencia.getFullYear(), referencia.getMonth() - 2, 1);
    const fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
    return {
      inicio: formatDate(inicio),
      fim: formatDate(fim),
    };
  }

  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);

  return {
    inicio: formatDate(inicio),
    fim: formatDate(fim),
  };
}

export function normalizeFuncaoProfissional(funcao?: string | null) {
  if (!funcao) {
    return 'Regente';
  }

  const encontrada = EEI_FUNCOES_PROFISSIONAIS.find(
    (item) => item.toLowerCase() === String(funcao).trim().toLowerCase(),
  );

  return encontrada || 'Regente';
}

export function firstReturnedRow<T = Record<string, unknown>>(result: unknown): T | undefined {
  if (!Array.isArray(result)) {
    return undefined;
  }

  const first = result[0];
  if (Array.isArray(first)) {
    return first[0] as T | undefined;
  }

  return first as T | undefined;
}
