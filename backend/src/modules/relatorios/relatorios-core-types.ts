export type RelatorioFiltroValor = unknown;
export type RelatorioFiltros = Record<string, RelatorioFiltroValor> & {
  quarto?: string;
  genero?: string;
  lgbt?: boolean;
  cor?: string;
};
export type SqlParam = string | number | boolean | Date | null;
export type RelatorioExecutivoEscopo = 'institucional' | 'albergue' | 'creche' | 'comercial';
export type RelatorioExecutivoPeriodo = 'dia' | 'semana' | 'mes' | 'ano';
export type RelatorioExecutivoTone = 'default' | 'success' | 'warning' | 'danger' | 'muted';

export interface PeriodoExecutivo {
  escopo: RelatorioExecutivoPeriodo;
  inicio: string;
  fim: string;
  label: string;
}

export interface RelatorioExecutivoKpi {
  id: string;
  label: string;
  value: number | string;
  detail: string;
  tone?: RelatorioExecutivoTone;
  format?: 'number' | 'currency' | 'percent';
}

export function formatDateShared(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getExecutivePeriod(value?: string): PeriodoExecutivo {
  const escopo: RelatorioExecutivoPeriodo =
    value === 'dia' || value === 'semana' || value === 'ano' ? value : 'mes';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const inicio = new Date(hoje);
  const fim = new Date(hoje);

  if (escopo === 'dia') {
    fim.setDate(hoje.getDate() + 1);
  } else if (escopo === 'semana') {
    inicio.setDate(hoje.getDate() - 6);
    fim.setDate(hoje.getDate() + 1);
  } else if (escopo === 'ano') {
    inicio.setMonth(0, 1);
    fim.setFullYear(hoje.getFullYear() + 1, 0, 1);
  } else {
    inicio.setDate(1);
    fim.setMonth(hoje.getMonth() + 1, 1);
  }

  const labels: Record<RelatorioExecutivoPeriodo, string> = {
    dia: 'Hoje',
    semana: 'Últimos 7 dias',
    mes: 'Mês atual',
    ano: 'Ano atual',
  };

  return {
    escopo,
    inicio: formatDateShared(inicio),
    fim: formatDateShared(fim),
    label: labels[escopo],
  };
}
