import { CrecheDashboardService } from './creche-dashboard.service';

// ── Helpers ─────────────────────────────────────────

function createMockDataSource() {
  return {
    query: jest.fn(),
  };
}

function createMockSchema() {
  return {
    ensureEstruturaEei: jest.fn().mockResolvedValue(undefined),
  };
}

function createService() {
  const dataSource = createMockDataSource();
  const schema = createMockSchema();

  const service = new CrecheDashboardService(
    dataSource as never,
    schema as never,
  );

  return { service, dataSource, schema };
}

// ── Tests ───────────────────────────────────────────

describe('CrecheDashboardService — analytics do dashboard', () => {
  it('getDashboard retorna estrutura esperada com dados mockados', async () => {
    const { service, dataSource, schema } = createService();

    // Com inicio+fim explícitos, o bloco de auto-detecção é ignorado.
    // Ordem das queries: totais → frequencia → grafico → turmas → evasao
    dataSource.query
      .mockResolvedValueOnce([{                      // 1. totais criancas
        total_criancas: 20,
        sem_nis: 3,
        ingressos_periodo: 2,
      }])
      .mockResolvedValueOnce([{                      // 2. frequencia media
        frequencia_media: 85,
      }])
      .mockResolvedValueOnce([                       // 3. frequencia grafico (diário)
        { data: '2026-06-02', dia: 'Seg', presentes: 18, ausentes: 2, frequencia: 90 },
        { data: '2026-06-03', dia: 'Ter', presentes: 16, ausentes: 4, frequencia: 80 },
      ])
      .mockResolvedValueOnce([                       // 4. turmas
        { id: 't1', nome: 'Berçário I', criancas: 8, frequencia: 88 },
      ])
      .mockResolvedValueOnce([]);                    // 5. sinais evasao (vazio)

    const result = await service.getDashboard('2026-06-01', '2026-06-30');

    expect(schema.ensureEstruturaEei).toHaveBeenCalled();
    expect(result.totalCriancas).toBe(20);
    expect(result.frequenciaMedia).toBe(85);
    expect(result.semNis).toBe(3);
    expect(result.ingressosPeriodo).toBe(2);
    expect(result.riscoEvasao).toBe(0);
    expect(result.turmas).toHaveLength(1);
    expect(result.frequenciaSemanal).toHaveLength(2);
  });

  it('calcula frequência com valores zerados sem erro', async () => {
    const { service, dataSource } = createService();

    // Com datas explícitas: 5 queries
    dataSource.query
      .mockResolvedValueOnce([{                       // 1. totais
        total_criancas: 0,
        sem_nis: 0,
        ingressos_periodo: 0,
      }])
      .mockResolvedValueOnce([{ frequencia_media: 0 }]) // 2. frequencia
      .mockResolvedValueOnce([])                      // 3. grafico vazio
      .mockResolvedValueOnce([])                      // 4. turmas vazio
      .mockResolvedValueOnce([]);                     // 5. evasao vazio

    const result = await service.getDashboard('2026-01-01', '2026-01-31');

    expect(result.totalCriancas).toBe(0);
    expect(result.frequenciaMedia).toBe(0);
    expect(result.turmas).toHaveLength(0);
    expect(result.frequenciaSemanal).toHaveLength(0);
  });

  it('retorna sinais de evasão quando há crianças em risco', async () => {
    const { service, dataSource } = createService();

    // Com datas explícitas: 5 queries
    dataSource.query
      .mockResolvedValueOnce([{                       // 1. totais
        total_criancas: 15,
        sem_nis: 1,
        ingressos_periodo: 0,
      }])
      .mockResolvedValueOnce([{ frequencia_media: 72 }]) // 2. frequencia
      .mockResolvedValueOnce([])                      // 3. grafico
      .mockResolvedValueOnce([])                      // 4. turmas
      .mockResolvedValueOnce([                        // 5. sinais evasao
        { id: 'C001', nome: 'Maria', turma: 'Maternal', faltas: 8, risco: 60, nivel: 'Grave' },
        { id: 'C002', nome: 'João', turma: 'Berçário', faltas: 5, risco: 42, nivel: 'Médio' },
      ]);

    const result = await service.getDashboard('2026-06-01', '2026-06-30');

    expect(result.riscoEvasao).toBe(2);
    expect(result.sinaisEvasao).toHaveLength(2);
    expect(result.sinaisEvasao[0].nivel).toBe('Grave');
    expect(result.sinaisEvasao[1].risco).toBe(42);
  });
});
