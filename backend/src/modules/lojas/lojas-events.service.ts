import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { MASTER_DATABASE_CONNECTION } from '../../config/database.config';
import { DiasCruzGateway } from '../websocket/websocket.gateway';
import { LojasEventPayload } from './lojas-shared';

@Injectable()
export class LojasEventsService {
  constructor(
    @InjectDataSource(MASTER_DATABASE_CONNECTION) private readonly dataSource: DataSource,
    private readonly gateway: DiasCruzGateway,
  ) {}

  emitLojas(tipo: string, payload: LojasEventPayload = {}) {
    this.gateway.emitLojasAtualizadas({
      tipo,
      payload,
      emitidoEm: new Date().toISOString(),
    });
  }

  emitComandaAtualizada(payload: unknown) {
    this.gateway.emitComandaAtualizada(payload);
  }

  emitClienteComercialAtualizado(payload: unknown) {
    this.gateway.emitClienteComercialAtualizado(payload);
  }

  emitRetiradaAtualizada(payload: unknown) {
    this.gateway.emitRetiradaAtualizada(payload);
  }

  async registrarEvento(
    comandaId: string,
    tipo: string,
    descricao: string,
    usuario?: string,
    metadata: LojasEventPayload = {},
  ) {
    await this.dataSource.query(
      `
        INSERT INTO comercial.eventos_comanda (
          id, comanda_id, tipo, descricao, usuario, metadata, created_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6::jsonb, NOW())
      `,
      [randomUUID(), comandaId, tipo, descricao, usuario || null, JSON.stringify(metadata)],
    );
  }
}
