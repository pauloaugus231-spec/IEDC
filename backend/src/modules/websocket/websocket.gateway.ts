import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Pessoa } from '../../entities/pessoa.entity';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
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

  // ============================================
  // EVENTOS: ESPAÇO DE CUIDADOS
  // ============================================
  
  emitEspacoCuidadosSessaoIniciada(sessao: any) {
    this.server.emit('espaco-cuidados:sessao-iniciada', sessao);
  }

  emitEspacoCuidadosSessaoEncerrada(sessao: any) {
    this.server.emit('espaco-cuidados:sessao-encerrada', sessao);
  }

  emitEspacoCuidadosPessoaAdicionada(entrada: any) {
    this.server.emit('espaco-cuidados:pessoa-adicionada', entrada);
  }

  emitEspacoCuidadosStatusAtualizado(entrada: any) {
    this.server.emit('espaco-cuidados:status-atualizado', entrada);
  }

  emitEspacoCuidadosPassouVez(entrada: any) {
    this.server.emit('espaco-cuidados:passou-vez', entrada);
  }

  emitEspacoCuidadosDashboardAtualizado() {
    this.server.emit('espaco-cuidados:dashboard-atualizado');
  }
}
