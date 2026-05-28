import { useEffect, useState } from 'react';

export type ManagedUserRole =
  | 'gestora'
  | 'suporte'
  | 'coordenador_albergue'
  | 'coordenador_creche'
  | 'equipe_tecnica'
  | 'educador_albergue'
  | 'educador_creche'
  | 'financeiro'
  | 'loja_bazar'
  | 'loja_brecho'
  | 'loja_feirao';

export type ManagedServiceScope =
  | 'gestao'
  | 'suporte'
  | 'albergue'
  | 'creche'
  | 'institucional'
  | 'financeiro'
  | 'bazar'
  | 'brecho'
  | 'feirao';

export interface ManagedUser {
  id: string;
  login: string;
  name: string;
  displayName: string;
  role: ManagedUserRole;
  roleLabel: string;
  service: ManagedServiceScope;
  serviceLabel: string;
  homePath: string;
  ativo: boolean;
  mustChangePassword: boolean;
  passwordUpdatedAt: string | null;
  lastLoginAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreateManagedUserPayload {
  login: string;
  name: string;
  displayName?: string;
  role: ManagedUserRole;
  temporaryPassword: string;
  ativo?: boolean;
}

export interface UpdateManagedUserPayload {
  name?: string;
  displayName?: string;
  role?: ManagedUserRole;
  ativo?: boolean;
}

export async function listManagedUsers() {
  return apiFetch<ManagedUser[]>('/api/auth/users');
}

export async function createManagedUser(data: CreateManagedUserPayload) {
  return apiFetch<ManagedUser>('/api/auth/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateManagedUser(id: string, data: UpdateManagedUserPayload) {
  return apiFetch<ManagedUser>(`/api/auth/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function resetManagedUserPassword(id: string, temporaryPassword: string) {
  return apiFetch<ManagedUser>(`/api/auth/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ temporaryPassword }),
  });
}

export async function changeOwnPassword(data: { currentPassword: string; newPassword: string }) {
  return apiFetch('/api/auth/me/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Editar pessoa
export async function updatePessoa(id: string, data: any) {
  return apiFetch(`/api/pessoas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
export async function deleteOcorrencia(id: string) {
  return apiFetch(`/api/ocorrencias/${id}`, { method: 'DELETE' });
}
// Ocorrências
export async function getOcorrenciasByPessoaId(pessoaId: string) {
  return apiFetch(`/api/ocorrencias/pessoa/${pessoaId}`);
}

export async function createOcorrencia(data: {
  pessoa_id: string;
  tipo: string;
  titulo?: string;
  descricao: string;
  criado_por?: string;
  severidade?: string;
}) {
  return apiFetch('/api/ocorrencias', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
// Criar pessoa
export async function createPessoa(data: any) {
  return apiFetch('/api/pessoas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
// Buscar pessoa por ID
export async function getPessoaById(id: string) {
  return apiFetch(`/api/pessoas/${id}`);
}

// Buscar histórico de estadias por pessoa
export async function getEstadiasByPessoaId(pessoaId: string) {
  return apiFetch(`/api/estadias/pessoa/${pessoaId}`);
}
// Função para realizar check-in de uma pessoa
export async function checkinPessoa(pessoa_id: string, cama_id: string, funcionario?: string) {
  return apiFetch(`/api/estadias/checkin`, {
    method: 'POST',
    body: JSON.stringify({ pessoa_id, cama_id, funcionario }),
  });
}

// Função para realizar check-out de uma pessoa
export async function checkoutPessoa(pessoa_id: string, funcionario?: string, observacoes_checkout?: string) {
  return apiFetch(`/api/estadias/checkout`, {
    method: 'POST',
    body: JSON.stringify({ pessoa_id, funcionario, observacoes_checkout }),
  });
}

// Hook para buscar todos os usuários cadastrados, ordenados por nome
export function useTodasPessoas(reload = 0) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    console.log('[useTodasPessoas] Buscando pessoas...');
    apiFetch<any>(`/api/pessoas?limit=1000`)
      .then((res: any) => {
        console.log('[useTodasPessoas] Resposta:', res);
        // Se vier paginado, pega o campo data
        if (Array.isArray(res)) setData(res);
        else if (res && Array.isArray(res.data)) setData(res.data);
        else setData([]);
      })
      .catch(e => {
        console.error('[useTodasPessoas] Erro:', e);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [reload]);

  return { data, loading, error };
}
// Hook para buscar ocupação total
interface OcupacaoData {
  total: {
    ocupadas: number;
    total: number;
  };
  casas: {
    [key: string]: {
      ocupadas: number;
      total: number;
    };
  };
}

export function useOcupacaoTotal() {
  const [data, setData] = useState<OcupacaoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<OcupacaoData>('/api/dashboard/ocupacao')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export type OcupacaoPeriodo = 7 | 30 | 90 | 180 | 365;

export interface OcupacaoHistoricoPoint {
  data: string;
  ocupadas: number;
  total: number;
  percentual: number;
  ingressos: number;
}

export function useOcupacaoHistorico(periodo: OcupacaoPeriodo = 30) {
  const [data, setData] = useState<OcupacaoHistoricoPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<OcupacaoHistoricoPoint[]>(`/api/dashboard/ocupacao-historico?periodo=${periodo}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [periodo]);

  return { data, loading, error };
}

interface RelatoriosSociaisData {
  totalCadastros: number;
  novosCadastros: number;
  ocupacao: {
    ocupadas: number;
    total: number;
  };
  genero: Record<string, number>;
  sexo: Record<string, number>;
}

export function useRelatoriosSociais() {
  const [data, setData] = useState<RelatoriosSociaisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<RelatoriosSociaisData>('/api/dashboard/relatorios/sociais')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export type ImpactoSocialPeriodo = 'mes' | 'trimestre' | 'ano' | 'todos';

export interface ImpactoSocialCount {
  label: string;
  total: number;
}

export interface ImpactoSocialText {
  id: string;
  data: string;
  texto: string;
}

export interface ImpactoSocialDashboardData {
  periodo: {
    escopo: string;
    inicio: string;
    fim: string;
  };
  kpis: {
    totalRespostas: number;
    protecaoPernoite: number;
    protecaoPernoitePercentual: number;
    respeitoUsuarios: number;
    respeitoUsuariosPercentual: number;
    comunicacaoClara: number;
    comunicacaoClaraPercentual: number;
    proximoPasso: number;
    proximoPassoPercentual: number;
    oficinaAtividade: number;
    oficinaAtividadePercentual: number;
    relatos: number;
    melhorias: number;
  };
  distribuicoes: {
    situacaoTerritorial: ImpactoSocialCount[];
    tempoSemMoradia: ImpactoSocialCount[];
    fatoresSemMoradia: ImpactoSocialCount[];
    ajudaPrincipal: ImpactoSocialCount[];
    proximosPassos: ImpactoSocialCount[];
    respeitoUsuarios: ImpactoSocialCount[];
    comunicacaoEquipe: ImpactoSocialCount[];
    proximoPassoAjuda: ImpactoSocialCount[];
    participouOficina: ImpactoSocialCount[];
    demandasEquipe: ImpactoSocialCount[];
    acaoEquipe: ImpactoSocialCount[];
  };
  serieMensal: {
    data: string;
    label: string;
    respostas: number;
  }[];
  radar: {
    label: string;
    valor: number;
  }[];
  relatos: ImpactoSocialText[];
  melhorias: ImpactoSocialText[];
  palavrasRelatos: ImpactoSocialCount[];
  palavrasMelhorias: ImpactoSocialCount[];
}

export interface CreateImpactoAlberguePayload {
  dataReferencia: string;
  situacaoTerritorial: string;
  tempoSemMoradia: string;
  fatoresSemMoradia: string[];
  fatoresSemMoradiaOutro?: string;
  ajudaPrincipal: string[];
  ajudaPrincipalOutro?: string;
  respeitoUsuarios: string;
  comunicacaoEquipe: string;
  proximoPassoAjuda: string;
  proximosPassos: string[];
  proximoPassoOutro?: string;
  participouOficina: string;
  relatoRepresenta?: string;
  melhoriaSugerida?: string;
  demandasEquipe: string[];
  demandaOutro?: string;
  acaoEquipe: string[];
  preenchidoPor?: string;
  perfilPreenchedor?: string;
}

export function useImpactoSocialAlbergue(periodo: ImpactoSocialPeriodo = 'mes', reload = 0) {
  const [data, setData] = useState<ImpactoSocialDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<ImpactoSocialDashboardData>(`/api/impacto-social/albergue?periodo=${periodo}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [periodo, reload]);

  return { data, loading, error };
}

export async function createImpactoAlbergueResposta(data: CreateImpactoAlberguePayload) {
  return apiFetch('/api/impacto-social/albergue/respostas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

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

export type LojaSlug = 'bazar' | 'brecho' | 'feirao';
export type LojasPeriodo = 'dia' | 'semana' | 'mes' | 'ano';
export type ComandaStatus =
  | 'aberta'
  | 'aguardando_pagamento'
  | 'paga'
  | 'desistencia'
  | 'cancelada'
  | 'expirada';

export interface LojaComercial {
  id: string;
  slug: LojaSlug;
  nome: string;
  ativa: boolean;
}

export interface ProdutoLoja {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  ativo: boolean;
  lojaId: string;
  lojaSlug: LojaSlug;
  loja: string;
}

export interface ClienteComercial {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  email: string;
  endereco: string;
  dataNascimento: string | null;
  observacoes: string | null;
  totalGasto: number;
  compras: number;
  ultimaCompra: string | null;
}

export interface ComandaResumo {
  id: string;
  codigo: string;
  status: ComandaStatus;
  criadaPor: string | null;
  observacoes: string | null;
  motivoStatus: string | null;
  criadaEm: string;
  atualizadaEm: string;
  finalizadaEm: string | null;
  clienteId: string;
  cliente: string;
  clienteTelefone: string;
  total: number;
  pago: number;
  saldo: number;
  itens: number;
  lojas: string;
  totalLoja?: number | null;
  itensLoja?: number | null;
  retiradaId?: string | null;
  retiradaStatus?: string | null;
  retiradaNotificadaEm?: string | null;
  retiradaEm?: string | null;
  retiradaEntreguePor?: string | null;
  retiradasTotal?: number;
  retiradasPendentes?: number;
  retiradasConcluidas?: number;
}

export interface ComandaDetalhe extends Omit<ComandaResumo, 'lojas' | 'itens'> {
  clienteCpf: string;
  clienteEmail: string;
  itens: {
    id: string;
    descricao: string;
    categoria: string;
    quantidade: number;
    valorUnitario: number;
    desconto: number;
    total: number;
    lojaId: string;
    lojaSlug: LojaSlug;
    loja: string;
    produtoId: string | null;
    produto: string | null;
  }[];
  pagamentos: {
    id: string;
    metodo: string;
    valor: number;
    recebidoPor: string;
    observacoes: string | null;
    criadoEm: string;
  }[];
  totaisPorLoja: {
    slug: LojaSlug;
    nome: string;
    total: number;
    itens: number;
  }[];
  retiradasPorLoja: RetiradaLoja[];
  retirada?: RetiradaLoja | null;
}

export interface RetiradaLoja {
  id: string;
  comandaId: string;
  codigo: string;
  comandaStatus: ComandaStatus;
  clienteId?: string;
  cliente: string;
  clienteTelefone: string;
  lojaSlug: LojaSlug;
  loja: string;
  status: 'aguardando_retirada' | 'retirado';
  notificadaEm: string;
  retiradaEm: string | null;
  entreguePor: string | null;
  observacoes: string | null;
  total: number;
  itens: number;
}

export interface LojasDashboardData {
  periodo: {
    escopo: LojasPeriodo;
    inicio: string;
    fim: string;
  };
  kpis: {
    vendasPagas: number;
    comandasPagas: number;
    vendasPrevistas: number;
    comandasAguardando: number;
    desistencias: number;
    valorDesistido: number;
    ticketMedio: number;
    taxaConversao: number;
  };
  porLoja: {
    slug: LojaSlug;
    nome: string;
    realizado: number;
    previsto: number;
    comandas: number;
  }[];
  porPagamento: {
    metodo: string;
    total: number;
    quantidade: number;
  }[];
  serie: {
    data: string;
    realizado: number;
    previsto: number;
  }[];
  comandasAguardando: ComandaResumo[];
  recentes: ComandaResumo[];
}

export function useLojas(periodoReload = 0) {
  const [data, setData] = useState<LojaComercial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<LojaComercial[]>('/api/lojas/lojas')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [periodoReload]);

  return { data, loading, error };
}

export function useProdutosLoja(lojaSlug?: string, reload = 0) {
  const [data, setData] = useState<ProdutoLoja[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (lojaSlug) params.set('lojaSlug', lojaSlug);

    setLoading(true);
    setError(null);
    apiFetch<ProdutoLoja[]>(`/api/lojas/produtos?${params.toString()}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [lojaSlug, reload]);

  return { data, loading, error };
}

export function useClientesComerciais(search: string, reload = 0) {
  const [data, setData] = useState<ClienteComercial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (search.trim().length < 2) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());

    setLoading(true);
    setError(null);
    apiFetch<ClienteComercial[]>(`/api/lojas/clientes?${params.toString()}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, reload]);

  return { data, loading, error };
}

export function useComandasComerciais(
  filters: { status?: string; lojaSlug?: string; periodo?: LojasPeriodo },
  reload = 0,
  refreshMs = 0,
) {
  const [data, setData] = useState<ComandaResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.lojaSlug) params.set('lojaSlug', filters.lojaSlug);
    if (filters.periodo) params.set('periodo', filters.periodo);

    const load = (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError(null);
      apiFetch<ComandaResumo[]>(`/api/lojas/comandas?${params.toString()}`)
        .then((response) => {
          if (mounted) setData(response);
        })
        .catch(e => {
          if (mounted) setError(e.message);
        })
        .finally(() => {
          if (mounted && showLoading) setLoading(false);
        });
    };

    load(true);
    const interval = refreshMs > 0 ? window.setInterval(() => load(false), refreshMs) : undefined;

    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
    };
  }, [filters.status, filters.lojaSlug, filters.periodo, reload, refreshMs]);

  return { data, loading, error };
}

export function useRetiradasLoja(
  filters: { lojaSlug?: LojaSlug; status?: string; periodo?: LojasPeriodo },
  reload = 0,
  refreshMs = 0,
) {
  const [data, setData] = useState<RetiradaLoja[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const params = new URLSearchParams();
    if (filters.lojaSlug) params.set('lojaSlug', filters.lojaSlug);
    if (filters.status) params.set('status', filters.status);
    if (filters.periodo) params.set('periodo', filters.periodo);

    const load = (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError(null);
      apiFetch<RetiradaLoja[]>(`/api/lojas/retiradas?${params.toString()}`)
        .then((response) => {
          if (mounted) setData(response);
        })
        .catch(e => {
          if (mounted) setError(e.message);
        })
        .finally(() => {
          if (mounted && showLoading) setLoading(false);
        });
    };

    load(true);
    const interval = refreshMs > 0 ? window.setInterval(() => load(false), refreshMs) : undefined;

    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
    };
  }, [filters.lojaSlug, filters.status, filters.periodo, reload, refreshMs]);

  return { data, loading, error };
}

export function useLojasDashboard(periodo: LojasPeriodo = 'dia', reload = 0, refreshMs = 0) {
  const [data, setData] = useState<LojasDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError(null);
      apiFetch<LojasDashboardData>(`/api/lojas/dashboard?periodo=${periodo}`)
        .then((response) => {
          if (mounted) setData(response);
        })
        .catch(e => {
          if (mounted) setError(e.message);
        })
        .finally(() => {
          if (mounted && showLoading) setLoading(false);
        });
    };

    load(true);
    const interval = refreshMs > 0 ? window.setInterval(() => load(false), refreshMs) : undefined;

    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
    };
  }, [periodo, reload, refreshMs]);

  return { data, loading, error };
}

export async function createClienteComercial(data: {
  nome: string;
  telefone?: string;
  cpf?: string;
  email?: string;
  endereco?: string;
  dataNascimento?: string;
  observacoes?: string;
}) {
  return apiFetch<ClienteComercial>('/api/lojas/clientes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateClienteComercial(id: string, data: {
  nome: string;
  telefone?: string;
  cpf?: string;
  email?: string;
  endereco?: string;
  dataNascimento?: string;
  observacoes?: string;
}) {
  return apiFetch<ClienteComercial>(`/api/lojas/clientes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function createProdutoLoja(data: {
  lojaSlug: LojaSlug;
  nome: string;
  categoria?: string;
  preco: number;
}) {
  return apiFetch<ProdutoLoja>('/api/lojas/produtos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProdutoLoja(id: string, data: {
  nome: string;
  categoria?: string;
  preco: number;
  ativo?: boolean;
}) {
  return apiFetch<ProdutoLoja>(`/api/lojas/produtos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function createComandaComercial(data: {
  clienteId?: string;
  cliente?: Partial<ClienteComercial>;
  criadaPor?: string;
  observacoes?: string;
}) {
  return apiFetch<ComandaDetalhe>('/api/lojas/comandas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getComandaComercial(id: string, lojaSlug?: LojaSlug) {
  const query = lojaSlug ? `?lojaSlug=${encodeURIComponent(lojaSlug)}` : '';
  return apiFetch<ComandaDetalhe>(`/api/lojas/comandas/${id}${query}`);
}

export async function addItemComandaComercial(id: string, data: {
  lojaSlug: LojaSlug;
  produtoId?: string;
  descricao: string;
  categoria?: string;
  quantidade: number;
  valorUnitario: number;
  desconto?: number;
  usuario?: string;
}) {
  return apiFetch<ComandaDetalhe>(`/api/lojas/comandas/${id}/itens`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function removeItemComandaComercial(id: string, itemId: string) {
  return apiFetch<ComandaDetalhe>(`/api/lojas/comandas/${id}/itens/${itemId}`, {
    method: 'DELETE',
  });
}

export async function registrarPagamentoComanda(id: string, data: {
  pagamentos: { metodo: string; valor: number }[];
  recebidoPor?: string;
  observacoes?: string;
}) {
  return apiFetch<ComandaDetalhe>(`/api/lojas/comandas/${id}/pagamentos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStatusComandaComercial(id: string, data: {
  status: ComandaStatus;
  motivo?: string;
  usuario?: string;
}) {
  return apiFetch<ComandaDetalhe>(`/api/lojas/comandas/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function confirmarRetiradaLoja(id: string, data: {
  entreguePor?: string;
  usuario?: string;
  observacoes?: string;
}) {
  return apiFetch<RetiradaLoja>(`/api/lojas/retiradas/${id}/confirmar`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
// src/api.ts
// Utilitário para requisições REST à API NestJS


// import { useAuth } from './KeycloakProvider';

const API_URL = ''; // VITE_API_URL não é mais necessário com o proxy

// Função para obter o token local da sessão
export function getAuthToken() {
  return localStorage.getItem('iedc_auth_token');
}

export function withAuthHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const token = getAuthToken();

  if (token) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }

  return nextHeaders;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = withAuthHeaders(options?.headers);

  // Adiciona 'Content-Type' apenas se o body não for FormData
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!res.ok) {
    let errorMessage: string;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`;
    } catch {
      // If JSON parsing fails, try to get text
      try {
        const errorText = await res.text();
        errorMessage = errorText || `HTTP ${res.status}: ${res.statusText}`;
      } catch {
        errorMessage = `HTTP ${res.status}: ${res.statusText}`;
      }
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export function useHospedes(query: string, reload = 0) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) { setData([]); return; }
    setLoading(true);
    setError(null);
    apiFetch<any[]>(`/api/pessoas/search?q=${encodeURIComponent(query)}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, reload]);

  return { data, loading, error };
}

// Buscar pessoas hospedadas por casa
export async function getPessoasByCasa(casa: string) {
  return apiFetch(`/api/camas/pessoas/${casa}`);
}

// API wrapper para interface axios-like
export const api = {
  get: async <T = any>(url: string) => {
    const data = await apiFetch<T>(url);
    return { data };
  },
  post: async <T = any>(url: string, body?: any) => {
    const data = await apiFetch<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { data };
  },
  patch: async <T = any>(url: string, body?: any) => {
    const data = await apiFetch<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return { data };
  },
  delete: async <T = any>(url: string) => {
    const data = await apiFetch<T>(url, {
      method: 'DELETE',
    });
    return { data };
  },
};
