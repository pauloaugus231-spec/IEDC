import { useEffect, useState } from 'react';
import { apiFetch } from './http';

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
