import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  EEI_TURMA_ORDER_SQL,
  getPeriodoMes,
  getPeriodoPorEscopo,
} from './creche-shared';
import { CrecheSchemaService } from './creche-schema.service';

@Injectable()
export class CrecheDashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly schema: CrecheSchemaService,
  ) {}

  async getDashboard(inicio?: string, fim?: string, escopo?: string) {
    await this.schema.ensureEstruturaEei();

    let periodo = getPeriodoMes(inicio, fim);

    if (!inicio && !fim) {
      const [frequenciasNoPeriodo] = await this.dataSource.query(
        `
          SELECT COUNT(*)::int AS total
          FROM creche_frequencias
          WHERE data BETWEEN $1::date AND $2::date
        `,
        [periodo.inicio, periodo.fim],
      );

      if (!Number(frequenciasNoPeriodo?.total || 0)) {
        const [ultimoRegistro] = await this.dataSource.query(
          `
            SELECT MAX(data) AS ultima_data
            FROM creche_frequencias
          `,
        );
        const ultimaData = ultimoRegistro?.ultima_data;

        if (ultimaData) {
          const referencia =
            ultimaData instanceof Date ? ultimaData : new Date(`${ultimaData}T12:00:00`);
          periodo = getPeriodoPorEscopo(referencia, escopo);
        }
      } else {
        periodo = getPeriodoPorEscopo(new Date(), escopo);
      }
    }

    const [totais] = await this.dataSource.query(
      `
        SELECT
          COUNT(*)::int AS total_criancas,
          COUNT(*) FILTER (WHERE nis IS NULL OR btrim(nis) = '')::int AS sem_nis,
          COUNT(*) FILTER (WHERE data_ingresso BETWEEN $1::date AND $2::date)::int AS ingressos_periodo
        FROM creche_criancas
        WHERE status = 'ativa'
      `,
      [periodo.inicio, periodo.fim],
    );

    const [frequencia] = await this.dataSource.query(
      `
        SELECT
          COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE presente) / NULLIF(COUNT(*), 0))::int, 0) AS frequencia_media
        FROM creche_frequencias
        WHERE data BETWEEN $1::date AND $2::date
      `,
      [periodo.inicio, periodo.fim],
    );

    const frequenciaSemanal = await this.getFrequenciaGrafico(
      escopo,
      periodo.inicio,
      periodo.fim,
    );

    const turmasData = await this.getTurmasDashboard(periodo.inicio, periodo.fim);
    const sinaisEvasao = await this.getSinaisEvasao(periodo.inicio, periodo.fim);

    return {
      periodo,
      totalCriancas: Number(totais?.total_criancas || 0),
      frequenciaMedia: Number(frequencia?.frequencia_media || 0),
      semNis: Number(totais?.sem_nis || 0),
      ingressosPeriodo: Number(totais?.ingressos_periodo || 0),
      riscoEvasao: sinaisEvasao.length,
      turmas: turmasData,
      frequenciaSemanal,
      sinaisEvasao,
    };
  }

  private async getFrequenciaGrafico(escopo: string | undefined, inicio: string, fim: string) {
    const frequenciaGraficoDiario = `
        WITH pontos AS (
          SELECT DISTINCT data AS periodo
          FROM creche_frequencias
          WHERE data BETWEEN $1::date AND $2::date
        )
        SELECT
          to_char(p.periodo, 'YYYY-MM-DD') AS data,
          CASE EXTRACT(DOW FROM p.periodo)
            WHEN 0 THEN 'Dom'
            WHEN 1 THEN 'Seg'
            WHEN 2 THEN 'Ter'
            WHEN 3 THEN 'Qua'
            WHEN 4 THEN 'Qui'
            WHEN 5 THEN 'Sex'
            WHEN 6 THEN 'Sáb'
          END AS dia,
          COUNT(*) FILTER (WHERE f.presente)::int AS presentes,
          COUNT(*) FILTER (WHERE NOT f.presente)::int AS ausentes,
          COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE f.presente) / NULLIF(COUNT(*), 0))::int, 0) AS frequencia
        FROM creche_frequencias f
        JOIN pontos p ON p.periodo = f.data
        GROUP BY p.periodo
        ORDER BY p.periodo
      `;

    const frequenciaGraficoMensal = `
        WITH agregada AS (
          SELECT
            date_trunc('week', f.data)::date AS periodo,
            COUNT(*) FILTER (WHERE f.presente)::int AS presentes,
            COUNT(*) FILTER (WHERE NOT f.presente)::int AS ausentes,
            COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE f.presente) / NULLIF(COUNT(*), 0))::int, 0) AS frequencia
          FROM creche_frequencias f
          WHERE f.data BETWEEN $1::date AND $2::date
          GROUP BY date_trunc('week', f.data)::date
        )
        SELECT
          to_char(periodo, 'YYYY-MM-DD') AS data,
          CONCAT('Sem ', ROW_NUMBER() OVER (ORDER BY periodo)) AS dia,
          presentes,
          ausentes,
          frequencia
        FROM agregada
        ORDER BY periodo
      `;

    const frequenciaGraficoTrimestral = `
        SELECT
          to_char(date_trunc('month', f.data)::date, 'YYYY-MM-DD') AS data,
          CASE EXTRACT(MONTH FROM f.data)
            WHEN 1 THEN 'Jan'
            WHEN 2 THEN 'Fev'
            WHEN 3 THEN 'Mar'
            WHEN 4 THEN 'Abr'
            WHEN 5 THEN 'Mai'
            WHEN 6 THEN 'Jun'
            WHEN 7 THEN 'Jul'
            WHEN 8 THEN 'Ago'
            WHEN 9 THEN 'Set'
            WHEN 10 THEN 'Out'
            WHEN 11 THEN 'Nov'
            WHEN 12 THEN 'Dez'
          END AS dia,
          COUNT(*) FILTER (WHERE f.presente)::int AS presentes,
          COUNT(*) FILTER (WHERE NOT f.presente)::int AS ausentes,
          COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE f.presente) / NULLIF(COUNT(*), 0))::int, 0) AS frequencia
        FROM creche_frequencias f
        WHERE f.data BETWEEN $1::date AND $2::date
        GROUP BY date_trunc('month', f.data)::date, EXTRACT(MONTH FROM f.data)
        ORDER BY date_trunc('month', f.data)::date
      `;

    return this.dataSource.query(
      escopo === 'trimestre'
        ? frequenciaGraficoTrimestral
        : escopo === 'mes'
          ? frequenciaGraficoMensal
          : frequenciaGraficoDiario,
      [inicio, fim],
    );
  }

  private async getTurmasDashboard(inicio: string, fim: string) {
    return this.dataSource.query(
      `
        SELECT
          t.id,
          t.nome,
          t.faixa_etaria AS "faixaEtaria",
          t.turno,
          t.capacidade,
          p.id AS "professoraId",
          p.nome AS professora,
          p.telefone AS "professoraTelefone",
          COUNT(DISTINCT c.id)::int AS criancas,
          COALESCE(ROUND(100.0 * COUNT(f.id) FILTER (WHERE f.presente) / NULLIF(COUNT(f.id), 0))::int, 0) AS frequencia
        FROM creche_turmas t
        LEFT JOIN creche_professoras p ON p.id = t.professora_responsavel_id
        LEFT JOIN creche_criancas c ON c.turma_id = t.id AND c.status = 'ativa'
        LEFT JOIN creche_frequencias f ON f.crianca_id = c.id AND f.data BETWEEN $1::date AND $2::date
        WHERE t.ativa = true
        GROUP BY t.id, t.nome, t.faixa_etaria, t.turno, t.capacidade, p.id, p.nome, p.telefone
        ORDER BY ${EEI_TURMA_ORDER_SQL}, t.nome
      `,
      [inicio, fim],
    );
  }

  private async getSinaisEvasao(inicio: string, fim: string) {
    return this.dataSource.query(
      `
        WITH
        frequencias AS (
          SELECT
            f.crianca_id,
            COUNT(f.id)::int AS dias_registrados,
            COUNT(f.id) FILTER (WHERE NOT f.presente)::int AS faltas,
            MAX(f.data) FILTER (WHERE f.presente) AS ultima_presenca
          FROM creche_frequencias f
          WHERE f.data BETWEEN $1::date AND $2::date
          GROUP BY f.crianca_id
        ),
        base AS (
          SELECT
            c.codigo AS id,
            c.nome,
            t.nome AS turma,
            COALESCE(f.faltas, 0)::int AS faltas,
            COALESCE(f.dias_registrados, 0)::int AS dias_registrados,
            f.ultima_presenca,
            r.nome AS responsavel,
            r.telefone,
            LEAST(
              100,
              COALESCE(f.faltas, 0) * 12
              + GREATEST(0, ($2::date - COALESCE(f.ultima_presenca, $1::date))::int) * 2
              + CASE WHEN r.telefone IS NULL OR btrim(r.telefone) = '' THEN 10 ELSE 0 END
            )::int AS risco
          FROM creche_criancas c
          JOIN creche_turmas t ON t.id = c.turma_id
          LEFT JOIN frequencias f ON f.crianca_id = c.id
          LEFT JOIN creche_responsaveis r ON r.crianca_id = c.id AND r.responsavel_principal = true
          WHERE c.status = 'ativa'
        )
        SELECT
          id,
          nome,
          turma,
          faltas,
          dias_registrados AS "diasRegistrados",
          CASE WHEN ultima_presenca IS NULL THEN NULL ELSE to_char(ultima_presenca, 'YYYY-MM-DD') END AS "ultimaPresenca",
          responsavel,
          telefone,
          risco,
          CASE
            WHEN risco >= 50 THEN 'Grave'
            WHEN risco >= 40 THEN 'Médio'
            ELSE 'Baixo'
          END AS nivel
        FROM base
        WHERE risco >= 40
        ORDER BY risco DESC, faltas DESC, nome
      `,
      [inicio, fim],
    );
  }
}
