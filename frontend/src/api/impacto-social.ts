import { useEffect, useState } from 'react';
import { apiFetch } from './http';

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
