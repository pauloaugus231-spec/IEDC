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
// src/api.ts
// Utilitário para requisições REST à API NestJS


// import { useAuth } from './KeycloakProvider';

const API_URL = ''; // VITE_API_URL não é mais necessário com o proxy

// Função para obter o token do Keycloak (caso exista)
function getToken() {
  try {
    const { keycloak } = (window as any).keycloakContext || {};
    return keycloak?.token || null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  
  // Headers padrão
  const headers: Record<string, string> = {};

  // Adiciona 'Content-Type' apenas se o body não for FormData
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options, // options vem primeiro para que headers possa ser sobrescrito
    headers: {
      ...headers,
      ...options?.headers,
    },
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

// Exemplo de hook para buscar hóspedes
import { useEffect, useState } from 'react';

export function useHospedes(query: string) {
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
  }, [query]);

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
