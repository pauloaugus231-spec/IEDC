import { useEffect, useState } from 'react';
import { apiFetch } from './http';

export type QualidadeAreaId = 'albergue' | 'creche' | 'financeiro';
export type QualidadeSeveridade = 'critico' | 'atencao' | 'informativo';

export interface QualidadeDadosSample {
  id: string;
  label: string;
  detail: string | null;
  path?: string;
}

export interface QualidadeDadosItem {
  id: string;
  area: QualidadeAreaId;
  title: string;
  description: string;
  severity: QualidadeSeveridade;
  total: number;
  status: 'ok' | 'pendente';
  actionLabel: string;
  actionPath: string;
  samples: QualidadeDadosSample[];
}

export interface QualidadeDadosArea {
  id: QualidadeAreaId;
  label: string;
  description: string;
  items: QualidadeDadosItem[];
  summary: {
    total: number;
    criticos: number;
    atencao: number;
    informativos: number;
    status: 'ok' | 'atencao' | 'critico';
  };
}

export interface QualidadeDadosResponse {
  generatedAt: string;
  scope: {
    areas: QualidadeAreaId[];
    role: string | null;
  };
  summary: {
    score: number;
    totalItems: number;
    affectedRecords: number;
    criticalItems: number;
    warningItems: number;
    informationalItems: number;
  };
  areas: QualidadeDadosArea[];
}

export function useQualidadeDados(area?: QualidadeAreaId) {
  const [data, setData] = useState<QualidadeDadosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = area ? `?area=${area}` : '';
    setLoading(true);
    setError(null);
    apiFetch<QualidadeDadosResponse>(`/api/qualidade-dados${query}`)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [area]);

  return { data, loading, error };
}
