import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from './http';

export type StatusCadastroPessoa = 'aprovado' | 'ativa' | 'inativo';
export type TipoVagaPessoa = 'masculina' | 'feminina' | 'lgbt' | 'idoso';

export interface PessoaEstadiaResumo {
  id?: string;
  data_checkin?: string | null;
  data_checkout?: string | null;
  cama?: {
    casa?: string | null;
    numero?: string | number | null;
  } | null;
}

export interface PessoaApi {
  id: string;
  nome: string;
  nome_social?: string | null;
  cpf?: string | null;
  rg?: string | null;
  nis?: string | null;
  data_nascimento?: string | null;
  naturalidade?: string | null;
  telefone?: string | null;
  sexo?: string | null;
  genero?: string | null;
  cor?: string | null;
  sexualidade?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  nome_mae?: string | null;
  nome_pai?: string | null;
  contato_emergencia?: string | null;
  telefone_emergencia?: string | null;
  alergias?: string | null;
  condicoes_cronicas?: string | null;
  medicamentos_uso_continuo?: string | null;
  observacoes?: string | null;
  status_cadastro: StatusCadastroPessoa;
  tipo_vaga: TipoVagaPessoa;
  foto_url?: string | null;
  ativo: boolean;
  liberacao_antecipada: boolean;
  lgbt: boolean;
  data_liberacao_antecipada?: string | null;
  presente: boolean;
  estadias?: PessoaEstadiaResumo[];
  bloqueios?: Array<Record<string, unknown>>;
  ocorrencias?: Array<Record<string, unknown>>;
  created_at?: string;
  updated_at?: string;
}

export type PessoaPayload = Partial<Omit<PessoaApi, 'id' | 'estadias' | 'bloqueios' | 'ocorrencias' | 'created_at' | 'updated_at'>>;

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PessoasResumo {
  total: number;
  hospedados: number;
  aprovados: number;
  liberados: number;
}

export interface PessoasPaginaQuery {
  search?: string;
  status?: StatusCadastroPessoa | 'todos';
  onlyLiberados?: boolean;
  limit?: number;
  reload?: number;
}

export interface PessoasPaginaState {
  data: PessoaApi[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  loading: boolean;
  error: string | null;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  refresh: () => void;
}

// Editar pessoa
export async function updatePessoa(id: string, data: PessoaPayload) {
  return apiFetch<PessoaApi>(`/api/pessoas/${id}`, {
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
export async function createPessoa(data: PessoaPayload) {
  return apiFetch<PessoaApi>('/api/pessoas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
// Buscar pessoa por ID
export async function getPessoaById(id: string) {
  return apiFetch<PessoaApi>(`/api/pessoas/${id}`);
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
export function useResumoPessoas(reload = 0) {
  const [data, setData] = useState<PessoasResumo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<PessoasResumo>('/api/pessoas/resumo')
      .then(setData)
      .catch((e) => {
        setError(e.message);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [reload]);

  return { data, loading, error };
}

export function useHospedes(query: string, reload = 0) {
  const [data, setData] = useState<PessoaApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) { setData([]); return; }
    setLoading(true);
    setError(null);
    apiFetch<PessoaApi[]>(`/api/pessoas/search?q=${encodeURIComponent(query)}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, reload]);

  return { data, loading, error };
}

export function usePessoasPaginadas({
  search,
  status,
  onlyLiberados = false,
  limit = 24,
  reload = 0,
}: PessoasPaginaQuery = {}): PessoasPaginaState {
  const [data, setData] = useState<PessoaApi[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const normalizedSearch = search?.trim() ?? '';
  const normalizedStatus = status && status !== 'todos' ? status : undefined;
  const safeLimit = Math.min(Math.max(Math.trunc(limit || 24), 1), 100);

  const buildUrl = useCallback((pageNumber: number) => {
    const params = new URLSearchParams({
      page: String(pageNumber),
      limit: String(safeLimit),
    });

    if (normalizedSearch) {
      params.set('search', normalizedSearch);
    }

    if (normalizedStatus) {
      params.set('status', normalizedStatus);
    }

    if (onlyLiberados) {
      params.set('liberados', 'true');
    }

    return `/api/pessoas?${params.toString()}`;
  }, [normalizedSearch, normalizedStatus, onlyLiberados, safeLimit]);

  const fetchPage = useCallback(async (pageNumber: number) => {
    return apiFetch<PaginatedResponse<PessoaApi>>(buildUrl(pageNumber));
  }, [buildUrl]);

  const loadPage = useCallback(async (pageNumber: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setData([]);
    setTotal(0);
    setTotalPages(0);
    setHasNextPage(false);
    setHasPreviousPage(false);

    try {
      const result = await fetchPage(pageNumber);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setData(result.data);
      setTotal(result.total);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setHasNextPage(result.hasNextPage);
      setHasPreviousPage(result.hasPreviousPage);
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Erro inesperado.');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [fetchPage]);

  useEffect(() => {
    void loadPage(page);

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadPage, page, reload]);

  const goToPage = useCallback((nextPage: number) => {
    setPage(Math.max(1, Math.trunc(nextPage || 1)));
  }, []);

  const previousPage = useCallback(() => {
    setPage((current) => Math.max(current - 1, 1));
  }, []);

  const nextPage = useCallback(() => {
    setPage((current) => current + 1);
  }, []);

  const refresh = useCallback(() => {
    void loadPage(page);
  }, [loadPage, page]);

  return {
    data,
    total,
    page,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    loading,
    error,
    goToPage,
    nextPage,
    previousPage,
    refresh,
  };
}

// Verificar duplicação por CPF
export type CheckCpfResult =
  | { exists: false }
  | { exists: true; id: string; nome: string; status_cadastro: string };

export async function checkCpf(cpf: string): Promise<CheckCpfResult> {
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return { exists: false };
  return apiFetch<CheckCpfResult>(`/api/pessoas/check-cpf?cpf=${encodeURIComponent(cpfLimpo)}`);
}

// Buscar pessoas hospedadas por casa
export async function getPessoasByCasa(casa: string) {
  return apiFetch(`/api/camas/pessoas/${casa}`);
}
