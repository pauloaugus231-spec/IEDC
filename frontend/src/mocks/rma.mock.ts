// 🧪 MOCK para testes da página de Conferência RMA
// Este arquivo simula as respostas do backend para testes locais

export interface MockResultadoConferencia {
  id: string;
  dataProcessamento: Date;
  periodo: { inicio: Date; fim: Date };
  encontradas: Array<{
    nome: string;
    cpf?: string;
    dataNascimento?: Date;
    nis?: string;
    temNis: boolean;
    inicioEstadia: Date;
    pessoaId: string;
  }>;
  apenasGesuas: Array<{
    nome: string;
    cpf?: string;
    dataNascimento?: string;
    nis?: string;
  }>;
  apenasSistema: Array<{
    nome: string;
    cpf?: string;
    dataNascimento?: Date;
    nis?: string;
    temNis: boolean;
    inicioEstadia: Date;
    pessoaId: string;
  }>;
  estatisticas: {
    totalGesuas: number;
    totalSistema: number;
    totalEncontradas: number;
    totalDivergencias: number;
    pessoasSemNis: number;
    porcentagemMatch: number;
  };
}

/**
 * Simula o processamento de conferência RMA
 * Cenário 1: Alta correspondência (90%+)
 */
export function mockConferenciaAltaCorrespondencia(): MockResultadoConferencia {
  const encontradas = Array.from({ length: 45 }, (_, i) => ({
    nome: `Pessoa Encontrada ${i + 1}`,
    cpf: `${String(i + 100).padStart(3, '0')}.${String(i + 200).padStart(3, '0')}.${String(i + 300).padStart(3, '0')}-${String(i % 100).padStart(2, '0')}`,
    dataNascimento: new Date(1960 + (i % 40), i % 12, (i % 28) + 1),
    nis: `${String(i + 10000000000).padStart(11, '0')}`,
    temNis: true,
    inicioEstadia: new Date(2024, 0, (i % 30) + 1),
    pessoaId: `pessoa-${i + 1}`
  }));

  const apenasGesuas = Array.from({ length: 3 }, (_, i) => ({
    nome: `Pessoa Apenas Gesuas ${i + 1}`,
    cpf: `900.${String(i + 100).padStart(3, '0')}.${String(i + 200).padStart(3, '0')}-00`,
    dataNascimento: new Date(1970 + i, i % 12, 15).toISOString().split('T')[0],
    nis: `${String(i + 90000000000).padStart(11, '0')}`
  }));

  const apenasSistema = Array.from({ length: 2 }, (_, i) => ({
    nome: `Pessoa Apenas Sistema ${i + 1}`,
    cpf: `800.${String(i + 100).padStart(3, '0')}.${String(i + 200).padStart(3, '0')}-00`,
    dataNascimento: new Date(1980 + i, i % 12, 20),
    nis: undefined,
    temNis: false,
    inicioEstadia: new Date(2024, 1, (i * 5) + 1),
    pessoaId: `pessoa-sistema-${i + 1}`
  }));

  return {
    id: `conf-${Date.now()}`,
    dataProcessamento: new Date(),
    periodo: {
      inicio: new Date(2024, 0, 1),
      fim: new Date(2024, 11, 31)
    },
    encontradas,
    apenasGesuas,
    apenasSistema,
    estatisticas: {
      totalGesuas: 48,
      totalSistema: 47,
      totalEncontradas: 45,
      totalDivergencias: 5,
      pessoasSemNis: 2,
      porcentagemMatch: 94
    }
  };
}

/**
 * Cenário 2: Média correspondência (70-89%)
 */
export function mockConferenciaMediaCorrespondencia(): MockResultadoConferencia {
  const encontradas = Array.from({ length: 28 }, (_, i) => ({
    nome: `Pessoa Encontrada ${i + 1}`,
    cpf: `${String(i + 100).padStart(3, '0')}.${String(i + 200).padStart(3, '0')}.${String(i + 300).padStart(3, '0')}-${String(i % 100).padStart(2, '0')}`,
    dataNascimento: new Date(1960 + (i % 40), i % 12, (i % 28) + 1),
    nis: i % 3 === 0 ? undefined : `${String(i + 10000000000).padStart(11, '0')}`,
    temNis: i % 3 !== 0,
    inicioEstadia: new Date(2024, 0, (i % 30) + 1),
    pessoaId: `pessoa-${i + 1}`
  }));

  const apenasGesuas = Array.from({ length: 8 }, (_, i) => ({
    nome: `Pessoa Apenas Gesuas ${i + 1}`,
    cpf: `900.${String(i + 100).padStart(3, '0')}.${String(i + 200).padStart(3, '0')}-00`,
    dataNascimento: new Date(1970 + i, i % 12, 15).toISOString().split('T')[0],
    nis: `${String(i + 90000000000).padStart(11, '0')}`
  }));

  const apenasSistema = Array.from({ length: 6 }, (_, i) => ({
    nome: `Pessoa Apenas Sistema ${i + 1}`,
    cpf: `800.${String(i + 100).padStart(3, '0')}.${String(i + 200).padStart(3, '0')}-00`,
    dataNascimento: new Date(1980 + i, i % 12, 20),
    nis: undefined,
    temNis: false,
    inicioEstadia: new Date(2024, 1, (i * 5) + 1),
    pessoaId: `pessoa-sistema-${i + 1}`
  }));

  return {
    id: `conf-${Date.now()}`,
    dataProcessamento: new Date(),
    periodo: {
      inicio: new Date(2024, 0, 1),
      fim: new Date(2024, 5, 30)
    },
    encontradas,
    apenasGesuas,
    apenasSistema,
    estatisticas: {
      totalGesuas: 36,
      totalSistema: 34,
      totalEncontradas: 28,
      totalDivergencias: 14,
      pessoasSemNis: 9,
      porcentagemMatch: 78
    }
  };
}

/**
 * Cenário 3: Baixa correspondência (<70%)
 */
export function mockConferenciaBaixaCorrespondencia(): MockResultadoConferencia {
  const encontradas = Array.from({ length: 12 }, (_, i) => ({
    nome: `Pessoa Encontrada ${i + 1}`,
    cpf: `${String(i + 100).padStart(3, '0')}.${String(i + 200).padStart(3, '0')}.${String(i + 300).padStart(3, '0')}-${String(i % 100).padStart(2, '0')}`,
    dataNascimento: new Date(1960 + (i % 40), i % 12, (i % 28) + 1),
    nis: i % 2 === 0 ? undefined : `${String(i + 10000000000).padStart(11, '0')}`,
    temNis: i % 2 !== 0,
    inicioEstadia: new Date(2024, 0, (i % 30) + 1),
    pessoaId: `pessoa-${i + 1}`
  }));

  const apenasGesuas = Array.from({ length: 18 }, (_, i) => ({
    nome: `Pessoa Apenas Gesuas ${i + 1}`,
    cpf: `900.${String(i + 100).padStart(3, '0')}.${String(i + 200).padStart(3, '0')}-00`,
    dataNascimento: new Date(1970 + i, i % 12, 15).toISOString().split('T')[0],
    nis: `${String(i + 90000000000).padStart(11, '0')}`
  }));

  const apenasSistema = Array.from({ length: 15 }, (_, i) => ({
    nome: `Pessoa Apenas Sistema ${i + 1}`,
    cpf: `800.${String(i + 100).padStart(3, '0')}.${String(i + 200).padStart(3, '0')}-00`,
    dataNascimento: new Date(1980 + i, i % 12, 20),
    nis: undefined,
    temNis: false,
    inicioEstadia: new Date(2024, 1, (i * 5) + 1),
    pessoaId: `pessoa-sistema-${i + 1}`
  }));

  return {
    id: `conf-${Date.now()}`,
    dataProcessamento: new Date(),
    periodo: {
      inicio: new Date(2024, 0, 1),
      fim: new Date(2024, 2, 31)
    },
    encontradas,
    apenasGesuas,
    apenasSistema,
    estatisticas: {
      totalGesuas: 30,
      totalSistema: 27,
      totalEncontradas: 12,
      totalDivergencias: 33,
      pessoasSemNis: 18,
      porcentagemMatch: 40
    }
  };
}

/**
 * Simula delay de rede
 */
export function mockDelay(ms: number = 2000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simula erro de processamento
 */
export function mockErroProcessamento(): never {
  throw new Error('Erro ao processar arquivo: formato inválido ou arquivo corrompido');
}

/**
 * Função principal para usar no frontend durante testes
 */
export async function mockConferirRMA(cenario: 'alta' | 'media' | 'baixa' | 'erro' = 'alta'): Promise<MockResultadoConferencia> {
  // Simular delay de processamento
  await mockDelay(2000);
  
  if (cenario === 'erro') {
    mockErroProcessamento();
  }
  
  switch (cenario) {
    case 'alta':
      return mockConferenciaAltaCorrespondencia();
    case 'media':
      return mockConferenciaMediaCorrespondencia();
    case 'baixa':
      return mockConferenciaBaixaCorrespondencia();
    default:
      return mockConferenciaAltaCorrespondencia();
  }
}
