import { useEffect, useState } from 'react';
import { apiFetch } from './http';

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
    retiradasPendentes: number;
    retiradasConcluidas: number;
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
    desistencias: number;
  }[];
  comandasAguardando: ComandaResumo[];
  recentes: ComandaResumo[];
}

export type RelatorioFinanceiroDimension = 'periodo' | 'loja' | 'metodo' | 'status';
export type RelatorioFinanceiroStatus = 'em_dia' | 'com_pendencias';

export interface RelatorioFinanceiroValor {
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percent';
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

export interface RelatorioFinanceiroData extends LojasDashboardData {
  ultimaAtualizacao: string;
  statusFechamento: RelatorioFinanceiroStatus;
  pendencias: ComandaResumo[];
  desistencias: ComandaResumo[];
  retiradas: {
    pendentes: number;
    concluidas: number;
  };
  ultimasComandas: ComandaResumo[];
}

export interface RelatorioFinanceiroDrilldown {
  key: string;
  dimension: RelatorioFinanceiroDimension;
  title: string;
  resumo: string;
  valores: RelatorioFinanceiroValor[];
}

export interface CaixaFinanceiro {
  id: string;
  codigo: string;
  status: 'aberto' | 'fechado';
  abertoPor: string | null;
  fechadoPor: string | null;
  saldoInicial: number;
  totalSistema: number;
  totalConferido: number;
  diferenca: number;
  comandasPagas: number;
  comandasDesistidas: number;
  observacoesAbertura: string | null;
  observacoesFechamento: string | null;
  abertoEm: string;
  fechadoEm: string | null;
}

export interface CaixaMetodoResumo {
  metodo: string;
  valorSistema: number;
  valorInformado: number;
  diferenca: number;
  quantidadePagamentos: number;
}

export interface CaixaPendenteResumo {
  id: string;
  codigo: string;
  cliente: string;
  status: ComandaStatus;
  total: number;
  pago: number;
  saldo: number;
  criadaEm: string;
}

export interface CaixaFinanceiroData {
  caixa: CaixaFinanceiro | null;
  metodos: CaixaMetodoResumo[];
  pendencias: CaixaPendenteResumo[];
  historico: CaixaFinanceiro[];
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
  enabled = true,
) {
  const [data, setData] = useState<ComandaResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setError(null);
      return undefined;
    }

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
  }, [enabled, filters.status, filters.lojaSlug, filters.periodo, reload, refreshMs]);

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

export function useRelatorioFinanceiro(periodo: LojasPeriodo = 'dia', reload = 0, refreshMs = 0) {
  const [data, setData] = useState<RelatorioFinanceiroData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError(null);
      apiFetch<RelatorioFinanceiroData>(`/api/lojas/relatorio-financeiro?periodo=${periodo}`)
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

export function useCaixaFinanceiro(reload = 0, refreshMs = 0) {
  const [data, setData] = useState<CaixaFinanceiroData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = (showLoading = false) => {
      if (showLoading) setLoading(true);
      setError(null);
      apiFetch<CaixaFinanceiroData>('/api/lojas/caixa')
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
  }, [reload, refreshMs]);

  return { data, loading, error };
}

export function abrirCaixaFinanceiro(payload: {
  saldoInicial?: number;
  abertoPor?: string;
  observacoes?: string;
}) {
  return apiFetch<CaixaFinanceiroData>('/api/lojas/caixa/abrir', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fecharCaixaFinanceiro(payload: {
  fechadoPor?: string;
  observacoes?: string;
  metodos: { metodo: string; valorInformado: number }[];
}) {
  return apiFetch<CaixaFinanceiroData>('/api/lojas/caixa/fechar', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getRelatorioFinanceiroDrilldown(
  periodo: LojasPeriodo,
  dimension: RelatorioFinanceiroDimension,
  key: string,
) {
  const params = new URLSearchParams({ periodo, dimension, key });
  return apiFetch<RelatorioFinanceiroDrilldown>(`/api/lojas/relatorio-financeiro/drilldown?${params.toString()}`);
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
