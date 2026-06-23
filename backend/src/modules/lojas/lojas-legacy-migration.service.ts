import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import {
  CORE_DATABASE_CONNECTION,
  MASTER_DATABASE_CONNECTION,
} from '../../config/database.config';

type LegacyRow = Record<string, unknown>;

@Injectable()
export class LojasLegacyMigrationService {
  private readonly logger = new Logger(LojasLegacyMigrationService.name);
  private readonly migrationKey = 'core_comercio_para_master_v1';

  constructor(
    @InjectDataSource(CORE_DATABASE_CONNECTION) private readonly core: DataSource,
    @InjectDataSource(MASTER_DATABASE_CONNECTION) private readonly master: DataSource,
  ) {}

  async migrateIfNeeded(): Promise<void> {
    const [legacy] = await this.core.query(
      `SELECT to_regclass('public.comercio_clientes')::text AS tabela`,
    ) as Array<{ tabela: string | null }>;

    if (!legacy?.tabela) {
      return;
    }

    const runner = this.master.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.query(`SELECT pg_advisory_xact_lock(7249013601)`);
      const [completed] = await runner.query(
        `SELECT chave FROM comercial.migracoes_legado WHERE chave = $1`,
        [this.migrationKey],
      );

      if (completed) {
        await runner.commitTransaction();
        return;
      }

      const counts = await this.copyLegacyData(runner);
      await runner.query(
        `
          INSERT INTO comercial.migracoes_legado (chave, detalhes, concluida_em)
          VALUES ($1, $2::jsonb, NOW())
        `,
        [this.migrationKey, JSON.stringify(counts)],
      );
      await runner.commitTransaction();
      this.logger.log(`Migracao comercial para iedc_master concluida: ${JSON.stringify(counts)}`);
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async copyLegacyData(runner: QueryRunner) {
    const clientes = await this.readLegacyTable('comercio_clientes');
    const lojas = await this.readLegacyTable('comercio_lojas');
    const produtos = await this.readLegacyTable('comercio_produtos');
    const caixas = await this.readLegacyTable('comercio_caixas');
    const comandas = await this.readLegacyTable('comercio_comandas');
    const itens = await this.readLegacyTable('comercio_comanda_itens');
    const caixaMetodos = await this.readLegacyTable('comercio_caixa_metodos');
    const pagamentos = await this.readLegacyTable('comercio_pagamentos');
    const eventos = await this.readLegacyTable('comercio_eventos_comanda');
    const retiradas = await this.readLegacyTable('comercio_retiradas');

    const clientesPorId = new Map(clientes.map((row) => [String(row.id), row]));

    await this.insertRows(runner, 'identidade.pessoas', [
      'id', 'nome_registro', 'nome_social', 'cpf', 'telefone', 'email', 'endereco',
      'data_nascimento', 'ativo', 'created_at', 'updated_at',
    ], clientes.map((row) => ({
      id: row.id,
      nome_registro: row.nome,
      nome_social: null,
      cpf: row.cpf || '',
      telefone: row.telefone || '',
      email: row.email || '',
      endereco: row.endereco || '',
      data_nascimento: row.data_nascimento || null,
      ativo: true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })));

    await this.insertRows(runner, 'comercial.perfis_pessoa', [
      'pessoa_id', 'observacoes', 'created_at', 'updated_at',
    ], clientes.map((row) => ({
      pessoa_id: row.id,
      observacoes: row.observacoes || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })), 'pessoa_id');

    await this.insertRows(runner, 'comercial.lojas', [
      'id', 'slug', 'nome', 'ativa', 'created_at', 'updated_at',
    ], lojas);

    await this.insertRows(runner, 'comercial.produtos', [
      'id', 'loja_id', 'nome', 'categoria', 'preco', 'ativo', 'created_at', 'updated_at',
    ], produtos);

    await this.insertRows(runner, 'comercial.caixas', [
      'id', 'codigo', 'status', 'aberto_por', 'fechado_por', 'saldo_inicial',
      'total_sistema', 'total_conferido', 'diferenca', 'comandas_pagas',
      'comandas_desistidas', 'observacoes_abertura', 'observacoes_fechamento',
      'aberto_em', 'fechado_em', 'created_at', 'updated_at',
    ], caixas);

    await this.insertRows(runner, 'comercial.comandas', [
      'id', 'codigo', 'pessoa_id', 'nome_pessoa_snapshot', 'status', 'criada_por',
      'observacoes', 'motivo_status', 'created_at', 'updated_at', 'finalizada_em',
    ], comandas.map((row) => {
      const pessoa = clientesPorId.get(String(row.cliente_id));
      return {
        id: row.id,
        codigo: row.codigo,
        pessoa_id: row.cliente_id,
        nome_pessoa_snapshot: pessoa?.nome || 'Pessoa nao identificada',
        status: row.status,
        criada_por: row.criada_por,
        observacoes: row.observacoes,
        motivo_status: row.motivo_status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        finalizada_em: row.finalizada_em,
      };
    }));

    await this.insertRows(runner, 'comercial.comanda_itens', [
      'id', 'comanda_id', 'loja_id', 'produto_id', 'descricao', 'categoria',
      'quantidade', 'valor_unitario', 'desconto', 'total_item', 'created_at',
    ], itens);

    await this.insertRows(runner, 'comercial.caixa_metodos', [
      'id', 'caixa_id', 'metodo', 'valor_sistema', 'valor_informado', 'diferenca',
      'quantidade_pagamentos', 'created_at',
    ], caixaMetodos);

    await this.insertRows(runner, 'comercial.pagamentos', [
      'id', 'comanda_id', 'caixa_id', 'metodo', 'valor', 'recebido_por',
      'observacoes', 'created_at',
    ], pagamentos.map((row) => ({ ...row, caixa_id: row.caixa_id || null })));

    await this.insertRows(runner, 'comercial.eventos_comanda', [
      'id', 'comanda_id', 'tipo', 'descricao', 'usuario', 'metadata', 'created_at',
    ], eventos);

    await this.insertRows(runner, 'comercial.retiradas', [
      'id', 'comanda_id', 'loja_id', 'status', 'notificada_em', 'retirada_em',
      'entregue_por', 'observacoes', 'created_at', 'updated_at',
    ], retiradas);

    return {
      pessoas: clientes.length,
      lojas: lojas.length,
      produtos: produtos.length,
      comandas: comandas.length,
      itens: itens.length,
      pagamentos: pagamentos.length,
      caixas: caixas.length,
      retiradas: retiradas.length,
    };
  }

  private async readLegacyTable(table: string): Promise<LegacyRow[]> {
    const [exists] = await this.core.query(
      `SELECT to_regclass($1)::text AS tabela`,
      [`public.${table}`],
    ) as Array<{ tabela: string | null }>;

    if (!exists?.tabela) {
      return [];
    }

    return this.core.query(`SELECT * FROM ${table}`);
  }

  private async insertRows(
    runner: QueryRunner,
    table: string,
    columns: string[],
    rows: LegacyRow[],
    conflictColumn = 'id',
  ): Promise<void> {
    for (const row of rows) {
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      await runner.query(
        `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (${conflictColumn}) DO NOTHING
        `,
        columns.map((column) => row[column] ?? null),
      );
    }
  }
}
