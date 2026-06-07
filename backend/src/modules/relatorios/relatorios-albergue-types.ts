export type RelatorioRow = Record<string, string | number | boolean | Date | null | undefined>;

export interface FaixaEtariaRow {
  faixa: string;
  total: number | string;
}

export interface PdfAutoTableOptions {
  head: string[][];
  body: string[][];
  startY: number;
}

export interface PdfWithAutoTable {
  autoTable(options: PdfAutoTableOptions): void;
}
