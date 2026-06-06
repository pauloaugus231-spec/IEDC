import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import {
  AcompanhamentoPayload,
  CreateCriancaPayload,
  CriancaTurmaPayload,
  EEI_TURMA_ORDER_SQL,
  firstReturnedRow,
  formatDate,
} from './creche-shared';
import { CrecheSchemaService } from './creche-schema.service';

@Injectable()
export class CrecheCadastrosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly schema: CrecheSchemaService,
  ) {}

  async getCriancas(filters?: { search?: string; turmaId?: string; status?: string }) {
    await this.schema.ensureEstruturaEei();

    const params: string[] = [];
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

  async createCrianca(body: CreateCriancaPayload) {
    await this.schema.ensureEstruturaEei();

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
    await this.schema.ensureEstruturaEei();
    await this.schema.ensureAcompanhamentosTable();

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

  async updateCriancaTurma(codigo: string, body: CriancaTurmaPayload) {
    await this.schema.ensureEstruturaEei();

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

  async createAcompanhamento(codigo: string, body: AcompanhamentoPayload) {
    await this.schema.ensureEstruturaEei();
    await this.schema.ensureAcompanhamentosTable();

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
}
