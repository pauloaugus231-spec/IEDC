import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';

function getPeriodoMes(inicio?: string, fim?: string) {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  return {
    inicio: inicio || primeiroDia.toISOString().slice(0, 10),
    fim: fim || ultimoDia.toISOString().slice(0, 10),
  };
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPeriodoPorEscopo(referencia: Date, escopo?: string) {
  if (escopo === 'semana') {
    const inicio = new Date(referencia);
    inicio.setDate(referencia.getDate() - 6);
    return {
      inicio: formatDate(inicio),
      fim: formatDate(referencia),
    };
  }

  if (escopo === 'trimestre') {
    const inicio = new Date(referencia.getFullYear(), referencia.getMonth() - 2, 1);
    const fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
    return {
      inicio: formatDate(inicio),
      fim: formatDate(fim),
    };
  }

  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);

  return {
    inicio: formatDate(inicio),
    fim: formatDate(fim),
  };
}

const EEI_TURMAS = [
  { nome: 'Berçário 1', faixaEtaria: '0 a 1 ano', turno: 'Integral', capacidade: 10, professora: 'Ana Paula Martins' },
  { nome: 'Berçário 2', faixaEtaria: '1 a 2 anos', turno: 'Integral', capacidade: 12, professora: 'Luciana Ribeiro' },
  { nome: 'Maternal 1', faixaEtaria: '2 a 3 anos', turno: 'Integral', capacidade: 14, professora: 'Fernanda Costa' },
  { nome: 'Maternal 2', faixaEtaria: '3 anos', turno: 'Integral', capacidade: 14, professora: 'Mariana Santos' },
  { nome: 'Jardim A', faixaEtaria: '4 anos', turno: 'Integral', capacidade: 16, professora: 'Patrícia Almeida' },
  { nome: 'Jardim A2', faixaEtaria: '4 anos', turno: 'Integral', capacidade: 16, professora: 'Camila Oliveira' },
  { nome: 'Jardim B', faixaEtaria: '5 anos', turno: 'Integral', capacidade: 18, professora: 'Roberta Nunes' },
  { nome: 'Jardim B2', faixaEtaria: '5 anos', turno: 'Integral', capacidade: 18, professora: 'Juliana Ferreira' },
];

const EEI_FUNCOES_PROFISSIONAIS = [
  'Regente',
  'Volante',
  'Técnica em desenvolvimento infantil',
  'Estagiária',
  'Temporária',
  'Substituta',
];

function normalizeFuncaoProfissional(funcao?: string | null) {
  if (!funcao) {
    return 'Regente';
  }

  const encontrada = EEI_FUNCOES_PROFISSIONAIS.find(
    (item) => item.toLowerCase() === String(funcao).trim().toLowerCase(),
  );

  return encontrada || 'Regente';
}

function firstReturnedRow<T = any>(result: any): T | undefined {
  if (Array.isArray(result?.[0])) {
    return result[0][0] as T | undefined;
  }

  return result?.[0] as T | undefined;
}

const EEI_TURMA_ORDER_SQL = `
  CASE t.nome
    WHEN 'Berçário 1' THEN 1
    WHEN 'Berçário 2' THEN 2
    WHEN 'Maternal 1' THEN 3
    WHEN 'Maternal 2' THEN 4
    WHEN 'Jardim A' THEN 5
    WHEN 'Jardim A2' THEN 6
    WHEN 'Jardim B' THEN 7
    WHEN 'Jardim B2' THEN 8
    ELSE 99
  END
`;

@Injectable()
export class CrecheService {
  private estruturaEeiPronta = false;
  private estruturaEeiPromise: Promise<void> | null = null;

  constructor(private readonly dataSource: DataSource) {}

  async getDashboard(inicio?: string, fim?: string, escopo?: string) {
    await this.ensureEstruturaEei();

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

    const frequenciaSemanal = await this.dataSource.query(
      escopo === 'trimestre'
        ? frequenciaGraficoTrimestral
        : escopo === 'mes'
          ? frequenciaGraficoMensal
          : frequenciaGraficoDiario,
      [periodo.inicio, periodo.fim],
    );

    const turmas = await this.dataSource.query(
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
      [periodo.inicio, periodo.fim],
    );

    const sinaisEvasao = await this.dataSource.query(
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
      [periodo.inicio, periodo.fim],
    );

    return {
      periodo,
      totalCriancas: Number(totais?.total_criancas || 0),
      frequenciaMedia: Number(frequencia?.frequencia_media || 0),
      semNis: Number(totais?.sem_nis || 0),
      ingressosPeriodo: Number(totais?.ingressos_periodo || 0),
      riscoEvasao: sinaisEvasao.length,
      turmas,
      frequenciaSemanal,
      sinaisEvasao,
    };
  }

  async getAfericao(inicio?: string, fim?: string) {
    await this.ensureEstruturaEei();

    const periodo = getPeriodoMes(inicio, fim);

    return this.dataSource.query(
      `
        SELECT
          c.codigo AS id,
          c.nome,
          c.cpf,
          c.nis,
          c.data_nascimento AS "dataNascimento",
          c.data_ingresso AS "dataIngresso",
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.data_nascimento))::int AS idade,
          c.sexo,
          c.genero,
          c.raca_cor AS "racaCor",
          t.nome AS turma,
          r.nome AS responsavel,
          r.parentesco,
          r.telefone,
          CASE WHEN c.nis IS NULL OR btrim(c.nis) = '' THEN 'Pendente' ELSE 'Informado' END AS "nisStatus"
        FROM creche_criancas c
        JOIN creche_turmas t ON t.id = c.turma_id
        LEFT JOIN creche_responsaveis r ON r.crianca_id = c.id AND r.responsavel_principal = true
        WHERE c.status = 'ativa'
          AND c.data_ingresso <= $1::date
        ORDER BY
          ${EEI_TURMA_ORDER_SQL},
          c.nome
      `,
      [periodo.fim],
    );
  }

  async getTurmas() {
    await this.ensureEstruturaEei();

    return this.dataSource.query(
      `
        SELECT
          t.id,
          t.nome,
          t.faixa_etaria AS "faixaEtaria",
          t.turno,
          t.capacidade,
          t.ativa,
          p.id AS "professoraId",
          p.nome AS professora,
          p.telefone AS "professoraTelefone",
          COUNT(c.id)::int AS criancas
        FROM creche_turmas t
        LEFT JOIN creche_professoras p ON p.id = t.professora_responsavel_id
        LEFT JOIN creche_criancas c ON c.turma_id = t.id AND c.status = 'ativa'
        WHERE t.ativa = true
        GROUP BY t.id, t.nome, t.faixa_etaria, t.turno, t.capacidade, t.ativa, p.id, p.nome, p.telefone
        ORDER BY ${EEI_TURMA_ORDER_SQL}, t.nome
      `,
    );
  }

  async getCriancas(filters?: { search?: string; turmaId?: string; status?: string }) {
    await this.ensureEstruturaEei();

    const params: any[] = [];
    const where = ['1 = 1'];

    if (filters?.search) {
      params.push(`%${filters.search.trim()}%`);
      where.push(
        `(c.nome ILIKE $${params.length} OR c.cpf ILIKE $${params.length} OR c.nis ILIKE $${params.length} OR c.codigo ILIKE $${params.length})`,
      );
    }

    if (filters?.turmaId) {
      params.push(filters.turmaId);
      where.push(`c.turma_id = $${params.length}::uuid`);
    }

    if (filters?.status && filters.status !== 'todos') {
      params.push(filters.status);
      where.push(`c.status = $${params.length}`);
    }

    return this.dataSource.query(
      `
        SELECT
          c.codigo AS id,
          c.id AS uuid,
          c.nome,
          c.cpf,
          c.nis,
          to_char(c.data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
          to_char(c.data_ingresso, 'YYYY-MM-DD') AS "dataIngresso",
          c.status,
          c.sexo,
          c.raca_cor AS "racaCor",
          t.id AS "turmaId",
          t.nome AS turma,
          p.nome AS professora,
          p.id AS "professoraId",
          COUNT(r.id)::int AS "responsaveis",
          MAX(r.nome) FILTER (WHERE r.responsavel_principal = true) AS "responsavelPrincipal",
          MAX(r.telefone) FILTER (WHERE r.responsavel_principal = true) AS telefone
        FROM creche_criancas c
        JOIN creche_turmas t ON t.id = c.turma_id
        LEFT JOIN creche_professoras p ON p.id = t.professora_responsavel_id
        LEFT JOIN creche_responsaveis r ON r.crianca_id = c.id
        WHERE ${where.join(' AND ')}
        GROUP BY c.id, t.id, t.nome, p.id, p.nome
        ORDER BY c.codigo
      `,
      params,
    );
  }

  async createCrianca(body: any) {
    await this.ensureEstruturaEei();

    if (!body?.nome || !body?.cpf || !body?.dataNascimento || !body?.turmaId) {
      throw new BadRequestException('Nome, CPF, data de nascimento e turma são obrigatórios.');
    }

    const responsaveisPayload =
      Array.isArray(body.responsaveis) && body.responsaveis.length
        ? body.responsaveis
        : body.responsavel
          ? [body.responsavel]
          : [];

    if (!responsaveisPayload.length) {
      throw new BadRequestException('Informe ao menos um responsável pela criança.');
    }

    const [proximoCodigo] = await this.dataSource.query(`
      SELECT
        COALESCE(MAX(NULLIF(regexp_replace(codigo, '\\D', '', 'g'), '')::int), 0) + 1 AS proximo
      FROM creche_criancas
    `);

    const codigo = body.codigo || `CR${String(Number(proximoCodigo?.proximo || 1)).padStart(4, '0')}`;
    const criancaId = randomUUID();

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `
          INSERT INTO creche_criancas (
            id,
            codigo,
            nome,
            cpf,
            rg,
            nis,
            data_nascimento,
            data_ingresso,
            turma_id,
            status,
            sexo,
            genero,
            raca_cor,
            naturalidade,
            endereco,
            bairro,
            cidade,
            uf,
            cep,
            escola_origem,
            alergias,
            condicoes_saude,
            medicamentos,
            autorizacao_imagem,
            observacoes,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7::date, $8::date, $9::uuid, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW()
          )
        `,
        [
          criancaId,
          codigo,
          body.nome,
          body.cpf,
          body.rg || null,
          body.nis || '',
          body.dataNascimento,
          body.dataIngresso || formatDate(new Date()),
          body.turmaId,
          body.status || 'ativa',
          body.sexo || 'menina',
          body.genero || null,
          body.racaCor || 'Não informado',
          body.naturalidade || 'Porto Alegre',
          body.endereco || 'Não informado',
          body.bairro || null,
          body.cidade || 'Porto Alegre',
          body.uf || 'RS',
          body.cep || null,
          body.escolaOrigem || null,
          body.alergias || null,
          body.condicoesSaude || null,
          body.medicamentos || null,
          Boolean(body.autorizacaoImagem),
          body.observacoes || null,
        ],
      );

      for (const [index, responsavel] of responsaveisPayload.entries()) {
        if (!responsavel?.nome || !responsavel?.telefone || !responsavel?.parentesco) {
          throw new BadRequestException('Nome, parentesco e telefone do responsável são obrigatórios.');
        }

        await manager.query(
          `
            INSERT INTO creche_responsaveis (
              id,
              crianca_id,
              nome,
              parentesco,
              cpf,
              rg,
              telefone,
              telefone_alternativo,
              email,
              endereco,
              bairro,
              cidade,
              uf,
              cep,
              trabalho,
              responsavel_principal,
              autorizado_retirada,
              observacoes,
              created_at,
              updated_at
            )
            VALUES (
              $1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
              $15, $16, $17, $18, NOW(), NOW()
            )
          `,
          [
            randomUUID(),
            criancaId,
            responsavel.nome,
            responsavel.parentesco,
            responsavel.cpf || '',
            responsavel.rg || null,
            responsavel.telefone,
            responsavel.telefoneAlternativo || null,
            responsavel.email || null,
            responsavel.endereco || body.endereco || 'Não informado',
            responsavel.bairro || body.bairro || null,
            responsavel.cidade || body.cidade || 'Porto Alegre',
            responsavel.uf || body.uf || 'RS',
            responsavel.cep || body.cep || null,
            responsavel.trabalho || null,
            index === 0 ? true : Boolean(responsavel.responsavelPrincipal),
            responsavel.autorizadoRetirada ?? true,
            responsavel.observacoes || null,
          ],
        );
      }
    });

    return this.getCriancaDetalhe(codigo);
  }

  async getCriancaDetalhe(codigo: string) {
    await this.ensureEstruturaEei();
    await this.ensureAcompanhamentosTable();

    const [crianca] = await this.dataSource.query(
      `
        SELECT
          c.codigo AS id,
          c.id AS uuid,
          c.nome,
          c.cpf,
          c.rg,
          c.nis,
          to_char(c.data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
          to_char(c.data_ingresso, 'YYYY-MM-DD') AS "dataIngresso",
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.data_nascimento))::int AS idade,
          c.status,
          c.sexo,
          c.genero,
          c.raca_cor AS "racaCor",
          c.naturalidade,
          c.endereco,
          c.bairro,
          c.cidade,
          c.uf,
          c.cep,
          c.escola_origem AS "escolaOrigem",
          c.alergias,
          c.condicoes_saude AS "condicoesSaude",
          c.medicamentos,
          c.autorizacao_imagem AS "autorizacaoImagem",
          c.observacoes,
          t.id AS "turmaId",
          t.nome AS turma,
          t.faixa_etaria AS "faixaEtaria",
          t.turno,
          p.id AS "professoraId",
          p.nome AS professora,
          p.telefone AS "professoraTelefone"
        FROM creche_criancas c
        JOIN creche_turmas t ON t.id = c.turma_id
        LEFT JOIN creche_professoras p ON p.id = t.professora_responsavel_id
        WHERE c.codigo = $1 OR c.id::text = $1
      `,
      [codigo],
    );

    if (!crianca) {
      throw new NotFoundException('Criança não encontrada.');
    }

    const responsaveis = await this.dataSource.query(
      `
        SELECT
          id,
          nome,
          parentesco,
          cpf,
          rg,
          telefone,
          telefone_alternativo AS "telefoneAlternativo",
          email,
          endereco,
          bairro,
          cidade,
          uf,
          cep,
          trabalho,
          responsavel_principal AS "responsavelPrincipal",
          autorizado_retirada AS "autorizadoRetirada",
          observacoes
        FROM creche_responsaveis
        WHERE crianca_id = $1::uuid
        ORDER BY responsavel_principal DESC, nome
      `,
      [crianca.uuid],
    );

    const frequenciasRecentes = await this.dataSource.query(
      `
        SELECT
          id,
          to_char(data, 'YYYY-MM-DD') AS data,
          presente,
          justificativa,
          registrado_por AS "registradoPor"
        FROM creche_frequencias
        WHERE crianca_id = $1::uuid
        ORDER BY data DESC
        LIMIT 30
      `,
      [crianca.uuid],
    );

    const [resumoFrequencia] = await this.dataSource.query(
      `
        SELECT
          COUNT(*)::int AS "diasRegistrados",
          COUNT(*) FILTER (WHERE presente)::int AS presencas,
          COUNT(*) FILTER (WHERE NOT presente)::int AS faltas,
          COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE presente) / NULLIF(COUNT(*), 0))::int, 0) AS percentual
        FROM creche_frequencias
        WHERE crianca_id = $1::uuid
          AND data >= CURRENT_DATE - INTERVAL '90 days'
      `,
      [crianca.uuid],
    );

    const acompanhamentos = await this.dataSource.query(
      `
        SELECT
          id,
          tipo,
          status,
          descricao,
          responsavel,
          to_char(data, 'YYYY-MM-DD') AS data,
          to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "criadoEm"
        FROM creche_acompanhamentos
        WHERE crianca_id = $1::uuid
        ORDER BY data DESC, created_at DESC
      `,
      [crianca.uuid],
    );

    return {
      crianca,
      responsaveis,
      frequenciasRecentes,
      resumoFrequencia,
      acompanhamentos,
    };
  }

  async getFrequenciaTurma(turmaId: string, data: string) {
    await this.ensureEstruturaEei();

    if (!turmaId || !data) {
      throw new BadRequestException('Turma e data são obrigatórias.');
    }

    const [turma] = await this.dataSource.query(
      `
        SELECT
          t.id,
          t.nome,
          t.faixa_etaria AS "faixaEtaria",
          t.turno,
          t.capacidade,
          p.id AS "professoraId",
          p.nome AS professora,
          p.telefone AS "professoraTelefone"
        FROM creche_turmas t
        LEFT JOIN creche_professoras p ON p.id = t.professora_responsavel_id
        WHERE t.id = $1::uuid
      `,
      [turmaId],
    );

    if (!turma) {
      throw new NotFoundException('Turma não encontrada.');
    }

    const registros = await this.dataSource.query(
      `
        SELECT
          c.id AS "criancaId",
          c.codigo,
          c.nome,
          c.nis,
          c.sexo,
          f.id AS "frequenciaId",
          COALESCE(f.presente, true) AS presente,
          f.justificativa,
          f.registrado_por AS "registradoPor"
        FROM creche_criancas c
        LEFT JOIN creche_frequencias f ON f.crianca_id = c.id AND f.data = $2::date
        WHERE c.turma_id = $1::uuid
          AND c.status = 'ativa'
        ORDER BY c.nome
      `,
      [turmaId, data],
    );

    return {
      data,
      turma,
      registros,
    };
  }

  async saveFrequenciaTurma(body: any) {
    await this.ensureEstruturaEei();

    if (!body?.turmaId || !body?.data || !Array.isArray(body.registros)) {
      throw new BadRequestException('Turma, data e registros de frequência são obrigatórios.');
    }

    await this.dataSource.transaction(async (manager) => {
      for (const registro of body.registros) {
        await manager.query(
          `
            INSERT INTO creche_frequencias (
              id,
              crianca_id,
              turma_id,
              data,
              presente,
              justificativa,
              registrado_por,
              created_at,
              updated_at
            )
            VALUES ($1, $2::uuid, $3::uuid, $4::date, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (crianca_id, data)
            DO UPDATE SET
              presente = EXCLUDED.presente,
              justificativa = EXCLUDED.justificativa,
              registrado_por = EXCLUDED.registrado_por,
              updated_at = NOW()
          `,
          [
            randomUUID(),
            registro.criancaId,
            body.turmaId,
            body.data,
            Boolean(registro.presente),
            registro.justificativa || null,
            body.registradoPor || 'Coordenação da E.E.I.',
          ],
        );
      }
    });

    return this.getFrequenciaTurma(body.turmaId, body.data);
  }

  async createAcompanhamento(codigo: string, body: any) {
    await this.ensureEstruturaEei();
    await this.ensureAcompanhamentosTable();

    const [crianca] = await this.dataSource.query(
      `
        SELECT id
        FROM creche_criancas
        WHERE codigo = $1 OR id::text = $1
      `,
      [codigo],
    );

    if (!crianca) {
      throw new NotFoundException('Criança não encontrada.');
    }

    if (!body?.descricao) {
      throw new BadRequestException('A descrição do acompanhamento é obrigatória.');
    }

    const acompanhamentoResult = await this.dataSource.query(
      `
        INSERT INTO creche_acompanhamentos (
          id,
          crianca_id,
          tipo,
          status,
          descricao,
          responsavel,
          data,
          created_at,
          updated_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::date, NOW(), NOW())
        RETURNING
          id,
          tipo,
          status,
          descricao,
          responsavel,
          to_char(data, 'YYYY-MM-DD') AS data,
          to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "criadoEm"
      `,
      [
        randomUUID(),
        crianca.id,
        body.tipo || 'Busca ativa',
        body.status || 'Aberto',
        body.descricao,
        body.responsavel || 'Coordenação da E.E.I.',
        body.data || formatDate(new Date()),
      ],
    );
    const acompanhamento = firstReturnedRow(acompanhamentoResult);

    return acompanhamento;
  }

  async getProfessoras() {
    await this.ensureEstruturaEei();

    return this.dataSource.query(
      `
        SELECT
          p.id,
          p.nome,
          p.telefone,
          p.email,
          p.funcao,
          p.status,
          p.observacoes,
          COUNT(t.id)::int AS "totalTurmas",
          COALESCE(
            json_agg(
              json_build_object('id', t.id, 'nome', t.nome)
              ORDER BY ${EEI_TURMA_ORDER_SQL}, t.nome
            ) FILTER (WHERE t.id IS NOT NULL),
            '[]'::json
          ) AS turmas
        FROM creche_professoras p
        LEFT JOIN creche_turmas t ON t.professora_responsavel_id = p.id AND t.ativa = true
        GROUP BY p.id, p.nome, p.telefone, p.email, p.funcao, p.status, p.observacoes
        ORDER BY
          CASE p.status WHEN 'ativa' THEN 1 ELSE 2 END,
          p.nome
      `,
    );
  }

  async createProfessora(body: any) {
    await this.ensureEstruturaEei();

    if (!body?.nome) {
      throw new BadRequestException('Nome da professora é obrigatório.');
    }

    const professoraResult = await this.dataSource.query(
      `
        INSERT INTO creche_professoras (
          id,
          nome,
          telefone,
          email,
          funcao,
          status,
          observacoes,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (nome)
        DO UPDATE SET
          telefone = COALESCE(EXCLUDED.telefone, creche_professoras.telefone),
          email = COALESCE(EXCLUDED.email, creche_professoras.email),
          funcao = EXCLUDED.funcao,
          status = EXCLUDED.status,
          observacoes = COALESCE(EXCLUDED.observacoes, creche_professoras.observacoes),
          updated_at = NOW()
        RETURNING id, nome, telefone, email, funcao, status, observacoes
      `,
      [
        randomUUID(),
        body.nome.trim(),
        body.telefone || null,
        body.email || null,
        normalizeFuncaoProfissional(body.funcao),
        body.status || 'ativa',
        body.observacoes || null,
      ],
    );
    const professora = firstReturnedRow(professoraResult);

    return professora;
  }

  async updateProfessora(id: string, body: any) {
    await this.ensureEstruturaEei();

    if (!body?.nome) {
      throw new BadRequestException('Nome da profissional é obrigatório.');
    }

    const professoraResult = await this.dataSource.query(
      `
        UPDATE creche_professoras
        SET
          nome = $2,
          telefone = $3,
          email = $4,
          funcao = $5,
          status = $6,
          observacoes = $7,
          updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING id, nome, telefone, email, funcao, status, observacoes
      `,
      [
        id,
        body.nome.trim(),
        body.telefone || null,
        body.email || null,
        normalizeFuncaoProfissional(body.funcao),
        body.status || 'ativa',
        body.observacoes || null,
      ],
    );
    const professora = firstReturnedRow(professoraResult);

    if (!professora) {
      throw new NotFoundException('Profissional não encontrada.');
    }

    return professora;
  }

  async updateTurmaProfessora(id: string, body: any) {
    await this.ensureEstruturaEei();

    const turmaResult = await this.dataSource.query(
      `
        UPDATE creche_turmas
        SET professora_responsavel_id = $2::uuid, updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING id
      `,
      [id, body?.professoraId || null],
    );
    const turma = firstReturnedRow(turmaResult);

    if (!turma) {
      throw new NotFoundException('Turma não encontrada.');
    }

    return this.getTurmaDetalhe(id);
  }

  async updateCriancaTurma(codigo: string, body: any) {
    await this.ensureEstruturaEei();

    if (!body?.turmaId) {
      throw new BadRequestException('Turma é obrigatória.');
    }

    const criancaResult = await this.dataSource.query(
      `
        UPDATE creche_criancas
        SET turma_id = $2::uuid, updated_at = NOW()
        WHERE codigo = $1 OR id::text = $1
        RETURNING codigo
      `,
      [codigo, body.turmaId],
    );
    const crianca = firstReturnedRow<{ codigo: string }>(criancaResult);

    if (!crianca) {
      throw new NotFoundException('Criança não encontrada.');
    }

    return this.getCriancaDetalhe(crianca.codigo);
  }

  async getTurmaDetalhe(id: string) {
    await this.ensureEstruturaEei();

    const [turma] = await this.dataSource.query(
      `
        SELECT
          t.id,
          t.nome,
          t.faixa_etaria AS "faixaEtaria",
          t.turno,
          t.capacidade,
          t.ativa,
          p.id AS "professoraId",
          p.nome AS professora,
          p.telefone AS "professoraTelefone",
          p.email AS "professoraEmail",
          COUNT(c.id)::int AS criancas
        FROM creche_turmas t
        LEFT JOIN creche_professoras p ON p.id = t.professora_responsavel_id
        LEFT JOIN creche_criancas c ON c.turma_id = t.id AND c.status = 'ativa'
        WHERE t.id = $1::uuid
        GROUP BY t.id, t.nome, t.faixa_etaria, t.turno, t.capacidade, t.ativa, p.id, p.nome, p.telefone, p.email
      `,
      [id],
    );

    if (!turma) {
      throw new NotFoundException('Turma não encontrada.');
    }

    const criancas = await this.getCriancas({ turmaId: id, status: 'ativa' });

    const [indicadores] = await this.dataSource.query(
      `
        SELECT
          COUNT(DISTINCT c.id)::int AS "totalCriancas",
          COUNT(DISTINCT c.id) FILTER (WHERE c.nis IS NULL OR btrim(c.nis) = '')::int AS "semNis",
          COUNT(f.id) FILTER (WHERE f.data >= CURRENT_DATE - INTERVAL '30 days')::int AS "diasRegistrados",
          COUNT(f.id) FILTER (WHERE f.presente AND f.data >= CURRENT_DATE - INTERVAL '30 days')::int AS presencas,
          COUNT(f.id) FILTER (WHERE NOT f.presente AND f.data >= CURRENT_DATE - INTERVAL '30 days')::int AS faltas,
          COALESCE(
            ROUND(
              100.0 * COUNT(f.id) FILTER (WHERE f.presente AND f.data >= CURRENT_DATE - INTERVAL '30 days')
              / NULLIF(COUNT(f.id) FILTER (WHERE f.data >= CURRENT_DATE - INTERVAL '30 days'), 0)
            )::int,
            0
          ) AS "frequencia30Dias"
        FROM creche_criancas c
        LEFT JOIN creche_frequencias f ON f.crianca_id = c.id
        WHERE c.turma_id = $1::uuid
          AND c.status = 'ativa'
      `,
      [id],
    );

    return {
      turma,
      indicadores,
      criancas,
    };
  }

  private async ensureEstruturaEei() {
    if (this.estruturaEeiPronta) {
      return;
    }

    if (this.estruturaEeiPromise) {
      await this.estruturaEeiPromise;
      return;
    }

    this.estruturaEeiPromise = this.ensureEstruturaEeiInternal();

    try {
      await this.estruturaEeiPromise;
      this.estruturaEeiPronta = true;
    } finally {
      this.estruturaEeiPromise = null;
    }
  }

  private async ensureEstruturaEeiInternal() {
    await this.dataSource.query(
      `
        CREATE TABLE IF NOT EXISTS creche_professoras (
          id uuid PRIMARY KEY,
          nome varchar(160) NOT NULL,
          telefone varchar(40),
          email varchar(160),
          funcao varchar(80) NOT NULL DEFAULT 'Regente',
          status varchar(30) NOT NULL DEFAULT 'ativa',
          observacoes text,
          created_at timestamp NOT NULL DEFAULT NOW(),
          updated_at timestamp NOT NULL DEFAULT NOW()
        )
      `,
    );

    await this.dataSource.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS creche_professoras_nome_key
        ON creche_professoras (nome)
      `,
    );

    await this.dataSource.query(
      `
        ALTER TABLE creche_turmas
        ADD COLUMN IF NOT EXISTS professora_responsavel_id uuid
      `,
    );

    await this.dataSource.query(
      `
        ALTER TABLE creche_professoras
        ALTER COLUMN funcao SET DEFAULT 'Regente'
      `,
    );

    await this.dataSource.query(
      `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'creche_turmas_professora_responsavel_id_fkey'
          ) THEN
            ALTER TABLE creche_turmas
            ADD CONSTRAINT creche_turmas_professora_responsavel_id_fkey
            FOREIGN KEY (professora_responsavel_id)
            REFERENCES creche_professoras(id)
            ON DELETE SET NULL;
          END IF;
        END
        $$;
      `,
    );

    for (const [index, turma] of EEI_TURMAS.entries()) {
      const professoraResult = await this.dataSource.query(
        `
          INSERT INTO creche_professoras (
            id,
            nome,
            funcao,
            status,
            observacoes,
            created_at,
            updated_at
          )
          VALUES ($1, $2, 'Regente', 'ativa', $3, NOW(), NOW())
          ON CONFLICT (nome)
          DO UPDATE SET
            funcao = EXCLUDED.funcao,
            status = EXCLUDED.status,
            observacoes = COALESCE(creche_professoras.observacoes, EXCLUDED.observacoes),
            updated_at = NOW()
          RETURNING id
        `,
        [
          randomUUID(),
          turma.professora,
          `Professora responsável por ${turma.nome}.`,
        ],
      );
      const professora = firstReturnedRow<{ id: string }>(professoraResult);

      await this.dataSource.query(
        `
          INSERT INTO creche_turmas (
            id,
            nome,
            faixa_etaria,
            turno,
            capacidade,
            ativa,
            professora_responsavel_id,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, true, $6::uuid, NOW(), NOW())
          ON CONFLICT (nome)
          DO UPDATE SET
            faixa_etaria = EXCLUDED.faixa_etaria,
            turno = EXCLUDED.turno,
            capacidade = EXCLUDED.capacidade,
            ativa = true,
            professora_responsavel_id = COALESCE(creche_turmas.professora_responsavel_id, EXCLUDED.professora_responsavel_id),
            updated_at = NOW()
        `,
        [
          randomUUID(),
          turma.nome,
          turma.faixaEtaria,
          turma.turno,
          turma.capacidade,
          professora?.id,
        ],
      );

      if (index === EEI_TURMAS.length - 1) {
        await this.dataSource.query(
          `
            UPDATE creche_turmas
            SET ativa = false, updated_at = NOW()
            WHERE NOT (nome = ANY($1::text[]))
          `,
          [EEI_TURMAS.map((item) => item.nome)],
        );
      }
    }

    await this.dataSource.query(
      `
        WITH alvo AS (
          SELECT
            c.id,
            ROW_NUMBER() OVER (ORDER BY c.data_nascimento DESC, c.nome) AS linha,
            COUNT(*) OVER () AS total
          FROM creche_criancas c
          LEFT JOIN creche_turmas atual ON atual.id = c.turma_id
          WHERE c.status = 'ativa'
            AND NOT (COALESCE(atual.nome, '') = ANY($1::text[]))
        ),
        novas_turmas AS (
          SELECT
            t.id,
            ROW_NUMBER() OVER (ORDER BY ${EEI_TURMA_ORDER_SQL}, t.nome) AS linha
          FROM creche_turmas t
          WHERE t.nome = ANY($1::text[])
        )
        UPDATE creche_criancas c
        SET turma_id = nt.id, updated_at = NOW()
        FROM alvo a
        JOIN novas_turmas nt
          ON nt.linha = LEAST(
            ${EEI_TURMAS.length},
            FLOOR(((a.linha - 1) * ${EEI_TURMAS.length}.0) / NULLIF(a.total, 0))::int + 1
          )
        WHERE c.id = a.id
      `,
      [EEI_TURMAS.map((item) => item.nome)],
    );
  }

  private async ensureAcompanhamentosTable() {
    await this.dataSource.query(
      `
        CREATE TABLE IF NOT EXISTS creche_acompanhamentos (
          id uuid PRIMARY KEY,
          crianca_id uuid NOT NULL REFERENCES creche_criancas(id) ON DELETE CASCADE,
          tipo varchar NOT NULL,
          status varchar NOT NULL,
          descricao text NOT NULL,
          responsavel varchar NOT NULL,
          data date NOT NULL,
          created_at timestamp NOT NULL,
          updated_at timestamp NOT NULL
        )
      `,
    );
  }
}
