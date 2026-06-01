import { useEffect, useState } from 'react';
import { apiFetch } from './http';

export interface CrecheTurmaDashboard {
  id: string;
  nome: string;
  faixaEtaria: string;
  turno: string;
  capacidade: number;
  criancas: number;
  frequencia: number;
  professoraId: string | null;
  professora: string | null;
  professoraTelefone: string | null;
}

export interface CrecheFrequenciaSemanal {
  data: string;
  dia: string;
  presentes: number;
  ausentes: number;
  frequencia: number;
}

export interface CrecheSinalEvasao {
  id: string;
  nome: string;
  turma: string;
  faltas: number;
  diasRegistrados: number;
  ultimaPresenca: string | null;
  responsavel: string | null;
  telefone: string | null;
  risco: number;
  nivel: 'Grave' | 'Médio' | 'Baixo';
}

export interface CrecheDashboardData {
  periodo: {
    inicio: string;
    fim: string;
  };
  totalCriancas: number;
  frequenciaMedia: number;
  semNis: number;
  ingressosPeriodo: number;
  riscoEvasao: number;
  turmas: CrecheTurmaDashboard[];
  frequenciaSemanal: CrecheFrequenciaSemanal[];
  sinaisEvasao: CrecheSinalEvasao[];
}

export interface CrecheAfericaoRow {
  id: string;
  nome: string;
  cpf: string;
  nis: string;
  dataNascimento: string;
  dataIngresso: string;
  idade: number;
  sexo: string;
  genero: string | null;
  racaCor: string;
  turma: string;
  responsavel: string;
  parentesco: string;
  telefone: string;
  nisStatus: string;
}

export type CrechePeriodoDashboard = 'semana' | 'mes' | 'trimestre';

export function useCrecheDashboard(periodo: CrechePeriodoDashboard = 'mes') {
  const [data, setData] = useState<CrecheDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<CrecheDashboardData>(`/api/creche/dashboard?periodo=${periodo}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [periodo]);

  return { data, loading, error };
}

export function useCrecheAfericao() {
  const [data, setData] = useState<CrecheAfericaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<CrecheAfericaoRow[]>('/api/creche/afericao')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export interface CrecheTurma {
  id: string;
  nome: string;
  faixaEtaria: string;
  turno: string;
  capacidade: number;
  ativa: boolean;
  professoraId: string | null;
  professora: string | null;
  professoraTelefone: string | null;
  criancas: number;
}

export interface CrecheProfessora {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  funcao: string;
  status: string;
  observacoes: string | null;
  totalTurmas?: number;
  turmas?: { id: string; nome: string }[];
}

export interface CrecheCriancaListItem {
  id: string;
  uuid: string;
  nome: string;
  cpf: string;
  nis: string;
  dataNascimento: string;
  dataIngresso: string;
  status: string;
  sexo: string;
  racaCor: string;
  turmaId: string;
  turma: string;
  professora?: string | null;
  professoraId?: string | null;
  responsaveis: number;
  responsavelPrincipal: string | null;
  telefone: string | null;
}

export interface CrecheResponsavel {
  id?: string;
  nome: string;
  parentesco: string;
  cpf?: string;
  rg?: string | null;
  telefone: string;
  telefoneAlternativo?: string | null;
  email?: string | null;
  endereco?: string;
  bairro?: string | null;
  cidade?: string;
  uf?: string;
  cep?: string | null;
  trabalho?: string | null;
  responsavelPrincipal?: boolean;
  autorizadoRetirada?: boolean;
  observacoes?: string | null;
}

export interface CrecheCriancaDetalhe {
  crianca: CrecheCriancaListItem & {
    rg: string | null;
    idade: number;
    genero: string | null;
    naturalidade: string | null;
    endereco: string;
    bairro: string | null;
    cidade: string;
    uf: string;
    cep: string | null;
    escolaOrigem: string | null;
    alergias: string | null;
    condicoesSaude: string | null;
    medicamentos: string | null;
    autorizacaoImagem: boolean;
    observacoes: string | null;
    faixaEtaria: string;
    turno: string;
    professoraId: string | null;
    professora: string | null;
    professoraTelefone: string | null;
  };
  responsaveis: CrecheResponsavel[];
  frequenciasRecentes: {
    id: string;
    data: string;
    presente: boolean;
    justificativa: string | null;
    registradoPor: string;
  }[];
  resumoFrequencia: {
    diasRegistrados: number;
    presencas: number;
    faltas: number;
    percentual: number;
  };
  acompanhamentos: {
    id: string;
    tipo: string;
    status: string;
    descricao: string;
    responsavel: string;
    data: string;
    criadoEm: string;
  }[];
}

export interface CreateCrecheCriancaPayload {
  nome: string;
  cpf: string;
  rg?: string;
  nis?: string;
  dataNascimento: string;
  dataIngresso: string;
  turmaId: string;
  status?: string;
  sexo: string;
  genero?: string;
  racaCor: string;
  naturalidade?: string;
  endereco: string;
  bairro?: string;
  cidade: string;
  uf: string;
  cep?: string;
  escolaOrigem?: string;
  alergias?: string;
  condicoesSaude?: string;
  medicamentos?: string;
  autorizacaoImagem?: boolean;
  observacoes?: string;
  responsaveis: CrecheResponsavel[];
}

export interface CrecheFrequenciaTurma {
  data: string;
  turma: CrecheTurma;
  registros: {
    criancaId: string;
    codigo: string;
    nome: string;
    nis: string;
    sexo: string;
    frequenciaId: string | null;
    presente: boolean;
    justificativa: string | null;
    registradoPor: string | null;
  }[];
}

export interface CrecheTurmaDetalhe {
  turma: CrecheTurma & {
    professoraEmail: string | null;
  };
  indicadores: {
    totalCriancas: number;
    semNis: number;
    diasRegistrados: number;
    presencas: number;
    faltas: number;
    frequencia30Dias: number;
  };
  criancas: CrecheCriancaListItem[];
}

export function useCrecheTurmas(reload = 0) {
  const [data, setData] = useState<CrecheTurma[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<CrecheTurma[]>('/api/creche/turmas')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [reload]);

  return { data, loading, error };
}

export function useCrecheProfessoras(reload = 0) {
  const [data, setData] = useState<CrecheProfessora[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<CrecheProfessora[]>('/api/creche/professoras')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [reload]);

  return { data, loading, error };
}

export async function createCrecheProfessora(data: {
  nome: string;
  telefone?: string;
  email?: string;
  funcao?: string;
  status?: string;
  observacoes?: string;
}) {
  return apiFetch<CrecheProfessora>('/api/creche/professoras', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCrecheProfessora(id: string, data: {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  funcao?: string;
  status?: string;
  observacoes?: string | null;
}) {
  return apiFetch<CrecheProfessora>(`/api/creche/professoras/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getCrecheTurmaDetalhe(id: string) {
  return apiFetch<CrecheTurmaDetalhe>(`/api/creche/turmas/${id}`);
}

export async function updateCrecheTurmaProfessora(id: string, professoraId: string | null) {
  return apiFetch<CrecheTurmaDetalhe>(`/api/creche/turmas/${id}/professora`, {
    method: 'PATCH',
    body: JSON.stringify({ professoraId }),
  });
}

export function useCrecheCriancas(filters: { search?: string; turmaId?: string; status?: string }, reload = 0) {
  const [data, setData] = useState<CrecheCriancaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.turmaId) params.set('turmaId', filters.turmaId);
    if (filters.status) params.set('status', filters.status);

    setLoading(true);
    setError(null);
    apiFetch<CrecheCriancaListItem[]>(`/api/creche/criancas?${params.toString()}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters.search, filters.turmaId, filters.status, reload]);

  return { data, loading, error };
}

export async function createCrecheCrianca(data: CreateCrecheCriancaPayload) {
  return apiFetch<CrecheCriancaDetalhe>('/api/creche/criancas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCrecheCrianca(codigo: string) {
  return apiFetch<CrecheCriancaDetalhe>(`/api/creche/criancas/${codigo}`);
}

export async function updateCrecheCriancaTurma(codigo: string, turmaId: string) {
  return apiFetch<CrecheCriancaDetalhe>(`/api/creche/criancas/${codigo}/turma`, {
    method: 'PATCH',
    body: JSON.stringify({ turmaId }),
  });
}

export async function createCrecheAcompanhamento(codigo: string, data: {
  tipo: string;
  status: string;
  descricao: string;
  responsavel?: string;
  data?: string;
}) {
  return apiFetch(`/api/creche/criancas/${codigo}/acompanhamentos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCrecheFrequenciaTurma(turmaId: string, data: string) {
  const params = new URLSearchParams({ turmaId, data });
  return apiFetch<CrecheFrequenciaTurma>(`/api/creche/frequencias?${params.toString()}`);
}

export async function saveCrecheFrequenciaTurma(data: {
  turmaId: string;
  data: string;
  registradoPor?: string;
  registros: { criancaId: string; presente: boolean; justificativa?: string | null }[];
}) {
  return apiFetch<CrecheFrequenciaTurma>('/api/creche/frequencias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
