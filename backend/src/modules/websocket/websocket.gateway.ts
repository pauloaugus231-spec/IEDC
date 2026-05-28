import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Pessoa } from '../../entities/pessoa.entity';
import { resolveCorsOrigin } from '../../config/cors-origin';

@WebSocketGateway({
  cors: {
    origin: resolveCorsOrigin(),
    credentials: true,
  },
})
export class DiasCruzGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  afterInit(server: Server) {
    console.log('WebSocket iniciado');
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  emitNovoCadastro(pessoa: Pessoa) {
    this.server.emit('novoCadastro', pessoa);
  }

  emitCadastroAprovado(pessoa: Pessoa) {
    this.server.emit('cadastroAprovado', pessoa);
  }

  emitCadastroRecusado(pessoa: Pessoa) {
    this.server.emit('cadastroRecusado', pessoa);
  }

  emitNovaSolicitacao(solicitacao: any) {
    this.server.emit('novaSolicitacao', solicitacao);
  }

  emitVagasAtualizadas(painel: any) {
    this.server.emit('vagasAtualizadas', painel);
  }

  emitLojasAtualizadas(payload: any) {
    this.server.emit('lojas:atualizado', payload);
  }

  emitComandaAtualizada(payload: any) {
    this.server.emit('lojas:comanda-atualizada', payload);
  }

  emitClienteComercialAtualizado(payload: any) {
    this.server.emit('lojas:cliente-atualizado', payload);
  }

  emitRetiradaAtualizada(payload: any) {
    this.server.emit('lojas:retirada-atualizada', payload);
  }
}
