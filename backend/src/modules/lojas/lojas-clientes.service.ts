import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { ClienteDto, CriarComandaDto } from './dto/lojas-operacao.dto';
import { LojasEventsService } from './lojas-events.service';
import { LojasSchemaService } from './lojas-schema.service';
import { normalizeCpf } from './lojas-shared';

export interface ClienteComercial {
  id: string;
  nome: string;
  telefone?: string;
  cpf?: string;
  email?: string;
  endereco?: string;
  dataNascimento?: string | null;
  observacoes?: string | null;
  totalGasto?: number;
  compras?: number;
  ultimaCompra?: string | null;
}

@Injectable()
export class LojasClientesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly schema: LojasSchemaService,
    private readonly events: LojasEventsService,
  ) {}

  async getClientes(search?: string) {
    await this.schema.ensureEstrutura();

    const params: unknown[] = [];
    const where = ['1 = 1'];

    if (search?.trim()) {
      const termo = search.trim();
      const cpfDigits = normalizeCpf(termo);

      params.push(`%${termo}%`);
      const termoParam = params.length;
      const clauses = [
        `c.nome ILIKE $${termoParam}`,
        `c.telefone ILIKE $${termoParam}`,
        `c.cpf ILIKE $${termoParam}`,
      ];

      if (cpfDigits) {
        params.push(`%${cpfDigits}%`);
        clauses.push(`regexp_replace(c.cpf, '\\D', '', 'g') ILIKE $${params.length}`);
      }

      where.push(`(${clauses.join(' OR ')})`);
    }

    return this.dataSource.query(
      `
        WITH pagamentos AS (
          SELECT
            co.cliente_id,
            SUM(p.valor)::numeric(12,2) AS total_gasto,
            COUNT(DISTINCT p.comanda_id)::int AS compras,
            MAX(p.created_at) AS ultima_compra
          FROM comercio_comandas co
          JOIN comercio_pagamentos p ON p.comanda_id = co.id
          GROUP BY co.cliente_id
        )
        SELECT
          c.id,
          c.nome,
          c.telefone,
          c.cpf,
          c.email,
          c.endereco,
          to_char(c.data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
          c.observacoes,
          COALESCE(p.total_gasto, 0)::float AS "totalGasto",
          COALESCE(p.compras, 0)::int AS compras,
          CASE WHEN p.ultima_compra IS NULL THEN NULL ELSE to_char(p.ultima_compra, 'YYYY-MM-DD') END AS "ultimaCompra"
        FROM comercio_clientes c
        LEFT JOIN pagamentos p ON p.cliente_id = c.id
        WHERE ${where.join(' AND ')}
        ORDER BY c.nome
        LIMIT 40
      `,
      params,
    );
  }

  async createCliente(body: ClienteDto): Promise<ClienteComercial> {
    await this.schema.ensureEstrutura();

    if (!body?.nome?.trim()) {
      throw new BadRequestException('Nome do cliente é obrigatório.');
    }

    const cpf = await this.prepareCpf(body.cpf);
    const id = randomUUID();

    await this.dataSource.query(
      `
        INSERT INTO comercio_clientes (
          id, nome, telefone, cpf, email, endereco, data_nascimento, observacoes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::date, $8, NOW(), NOW())
      `,
      [
        id,
        body.nome.trim(),
        body.telefone?.trim() || '',
        cpf,
        body.email?.trim() || '',
        body.endereco?.trim() || '',
        body.dataNascimento || '',
        body.observacoes?.trim() || null,
      ],
    );

    const [cliente] = await this.dataSource.query(
      `
        SELECT
          id,
          nome,
          telefone,
          cpf,
          email,
          endereco,
          to_char(data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
          observacoes,
          0::float AS "totalGasto",
          0::int AS compras,
          NULL AS "ultimaCompra"
        FROM comercio_clientes
        WHERE id = $1::uuid
      `,
      [id],
    ) as ClienteComercial[];

    this.events.emitLojas('cliente_criado', { clienteId: id, nome: cliente.nome });

    return cliente;
  }

  async updateCliente(id: string, body: ClienteDto) {
    await this.schema.ensureEstrutura();

    if (!body?.nome?.trim()) {
      throw new BadRequestException('Nome do cliente é obrigatório.');
    }

    const cpf = await this.prepareCpf(body.cpf, id);

    const result = await this.dataSource.query(
      `
        UPDATE comercio_clientes
        SET nome = $2,
            telefone = $3,
            cpf = $4,
            email = $5,
            endereco = $6,
            data_nascimento = NULLIF($7, '')::date,
            observacoes = $8,
            updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING
          id,
          nome,
          telefone,
          cpf,
          email,
          endereco,
          to_char(data_nascimento, 'YYYY-MM-DD') AS "dataNascimento",
          observacoes
      `,
      [
        id,
        body.nome.trim(),
        body.telefone?.trim() || '',
        cpf,
        body.email?.trim() || '',
        body.endereco?.trim() || '',
        body.dataNascimento || '',
        body.observacoes?.trim() || null,
      ],
    );

    const cliente = Array.isArray(result?.[0]) ? result[0][0] : result?.[0] as ClienteComercial | undefined;

    if (!cliente) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    const response = {
      ...cliente,
      totalGasto: 0,
      compras: 0,
      ultimaCompra: null,
    };

    this.events.emitLojas('cliente_atualizado', { clienteId: id, nome: cliente.nome });
    this.events.emitClienteComercialAtualizado(response);

    return response;
  }

  async resolveClienteId(body: CriarComandaDto) {
    if (body?.clienteId) {
      return body.clienteId;
    }

    if (body?.cliente?.nome) {
      const cliente = await this.createCliente(body.cliente);
      return cliente.id;
    }

    throw new BadRequestException('Cliente é obrigatório para abrir a comanda.');
  }

  private async prepareCpf(cpf?: string, ignoreId?: string) {
    const cpfDigits = normalizeCpf(cpf);

    if (!cpfDigits) {
      return '';
    }

    if (cpfDigits.length !== 11) {
      throw new BadRequestException('CPF deve conter 11 dígitos.');
    }

    const [duplicado] = await this.dataSource.query(
      `
        SELECT id, nome
        FROM comercio_clientes
        WHERE regexp_replace(cpf, '\\D', '', 'g') = $1
          AND ($2::uuid IS NULL OR id <> $2::uuid)
        LIMIT 1
      `,
      [cpfDigits, ignoreId || null],
    ) as Array<{ id: string; nome: string }>;

    if (duplicado) {
      throw new BadRequestException(`Já existe um cliente com este CPF: ${duplicado.nome}.`);
    }

    return cpfDigits;
  }
}
