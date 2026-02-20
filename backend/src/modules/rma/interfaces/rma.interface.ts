export interface PessoaGesuas {
  nome: string;
  cpf?: string;
  dataNascimento?: string;
  nis?: string;
  rg?: string;
}

export interface PessoaConsolidada {
  nome: string;
  cpf?: string;
  dataNascimento?: Date;
  nis?: string;
  temNis: boolean;
  inicioEstadia: Date;
  fimEstadia?: Date;
  estadiaId: string;
  pessoaId: string;
}

export interface ResultadoConferencia {
  id: string;
  dataProcessamento: Date;
  periodo: {
    inicio: Date;
    fim: Date;
  };
  
  // Pessoas que estão em ambos os sistemas
  encontradas: PessoaConsolidada[];
  
  // Pessoas apenas no arquivo Gesuas
  apenasGesuas: PessoaGesuas[];
  
  // Pessoas apenas no Sistema do albergue
  apenasSistema: PessoaConsolidada[];
  
  estatisticas: {
    totalGesuas: number;
    totalSistema: number;
    totalEncontradas: number;
    totalDivergencias: number;
    pessoasSemNis: number;
  };
}

export interface RelatorioRMA {
  id: string;
  periodo: string;
  pessoas: Array<{
    nome: string;
    cpf: string;
    dataNascimento: string;
    nis: string;
    temNis: boolean;
    inicioEstadia: string;
  }>;
  estatisticas: {
    total: number;
    comNis: number;
    semNis: number;
  };
}
