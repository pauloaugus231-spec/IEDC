import { useEffect, useState } from 'react';
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
  raca?: string | null;
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
  total?: number;
  page?: number;
  limit?: number;
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
export function useTodasPessoas(reload = 0) {
  const [data, setData] = useState<PessoaApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<PessoaApi[] | PaginatedResponse<PessoaApi>>(`/api/pessoas?limit=1000`)
      .then((res) => {
        if (Array.isArray(res)) setData(res);
        else if (isPaginatedResponse(res)) setData(res.data);
        else setData([]);
      })
      .catch(e => {
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [reload]);

  return { data, loading, error };
}

function isPaginatedResponse<T>(value: unknown): value is PaginatedResponse<T> {
  return Boolean(value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data));
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

// Buscar pessoas hospedadas por casa
export async function getPessoasByCasa(casa: string) {
  return apiFetch(`/api/camas/pessoas/${casa}`);
}
