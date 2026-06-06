import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import {
  EEI_TURMA_ORDER_SQL,
  ProfessoraPayload,
  SaveFrequenciaTurmaPayload,
  TurmaProfessoraPayload,
  firstReturnedRow,
  normalizeFuncaoProfissional,
  getPeriodoMes,
} from './creche-shared';
import { CrecheSchemaService } from './creche-schema.service';
import { CrecheCadastrosService } from './creche-cadastros.service';

@Injectable()
export class CrecheTurmasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly schema: CrecheSchemaService,
    private readonly cadastros: CrecheCadastrosService,
  ) {}

  async getAfericao(inicio?: string, fim?: string) {
    await this.schema.ensureEstruturaEei();

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
    await this.schema.ensureEstruturaEei();

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

  async getTurmaDetalhe(id: string) {
    await this.schema.ensureEstruturaEei();

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

    const criancas = await this.cadastros.getCriancas({ turmaId: id, status: 'ativa' });

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

  async updateTurmaProfessora(id: string, body: TurmaProfessoraPayload) {
    await this.schema.ensureEstruturaEei();

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

  async getFrequenciaTurma(turmaId: string, data: string) {
    await this.schema.ensureEstruturaEei();

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

  async saveFrequenciaTurma(body: SaveFrequenciaTurmaPayload) {
    await this.schema.ensureEstruturaEei();

    const registros = body.registros;
    if (!body?.turmaId || !body?.data || !Array.isArray(registros)) {
      throw new BadRequestException('Turma, data e registros de frequência são obrigatórios.');
    }

    await this.dataSource.transaction(async (manager) => {
      for (const registro of registros) {
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

  async getProfessoras() {
    await this.schema.ensureEstruturaEei();

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

  async createProfessora(body: ProfessoraPayload) {
    await this.schema.ensureEstruturaEei();

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

  async updateProfessora(id: string, body: ProfessoraPayload) {
    await this.schema.ensureEstruturaEei();

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
}
