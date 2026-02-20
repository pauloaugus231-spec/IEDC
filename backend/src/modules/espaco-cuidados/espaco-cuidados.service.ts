import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessaoEspacoCuidados, StatusSessao } from '../../entities/sessao-espaco-cuidados.entity';
import { FilaEspacoCuidados, StatusFilaCuidados } from '../../entities/fila-espaco-cuidados.entity';
import { Pessoa } from '../../entities/pessoa.entity';
import { DiasCruzGateway } from '../websocket/websocket.gateway';
import { TelegramService } from '../telegram/telegram.service';
import { ProntuariosService } from '../prontuarios/prontuarios.service';

@Injectable()
export class EspacoCuidadosService {
  constructor(
    @InjectRepository(SessaoEspacoCuidados)
    private sessaoRepository: Repository<SessaoEspacoCuidados>,
    @InjectRepository(FilaEspacoCuidados)
    private filaRepository: Repository<FilaEspacoCuidados>,
    @InjectRepository(Pessoa)
    private pessoaRepository: Repository<Pessoa>,
    private websocketGateway: DiasCruzGateway,
    private telegramService: TelegramService,
    private prontuariosService: ProntuariosService,
  ) {}

  // ============================================
  // GERENCIAMENTO DE SESSÕES
  // ============================================

  async iniciarSessao(data: Date, equipe: string[]): Promise<SessaoEspacoCuidados> {
    // Verificar se já existe sessão ativa
    const sessaoAtiva = await this.sessaoRepository.findOne({
      where: { status: StatusSessao.ATIVA },
    });

    if (sessaoAtiva) {
      throw new BadRequestException('Já existe uma sessão ativa. Encerre-a antes de iniciar outra.');
    }

    // Verificar se já existe sessão para esta data
    const sessaoExistente = await this.sessaoRepository.findOne({
      where: { data_sessao: data },
    });

    if (sessaoExistente) {
      // Atualizar sessão existente
      sessaoExistente.status = StatusSessao.ATIVA;
      sessaoExistente.hora_inicio = new Date();
      sessaoExistente.equipe = equipe;
      return await this.sessaoRepository.save(sessaoExistente);
    }

    // Criar nova sessão
    const novaSessao = this.sessaoRepository.create({
      data_sessao: data,
      status: StatusSessao.ATIVA,
      hora_inicio: new Date(),
      equipe,
    });

    const sessaoSalva = await this.sessaoRepository.save(novaSessao);

    // Emitir evento WebSocket
    this.websocketGateway.emitEspacoCuidadosSessaoIniciada(sessaoSalva);
    this.websocketGateway.emitEspacoCuidadosDashboardAtualizado();

    // Notificar Telegram
    await this.telegramService.notificarSessaoIniciada(sessaoSalva);

    return sessaoSalva;
  }

  async encerrarSessao(sessaoId: string): Promise<SessaoEspacoCuidados> {
    const sessao = await this.sessaoRepository.findOne({
      where: { id: sessaoId },
      relations: ['fila'],
    });

    if (!sessao) {
      throw new NotFoundException('Sessão não encontrada');
    }

    if (sessao.status === StatusSessao.ENCERRADA) {
      throw new BadRequestException('Sessão já está encerrada');
    }

    // Verificar se há pessoas ainda em atendimento
    const pessoasEmAtendimento = await this.filaRepository.count({
      where: { 
        sessao: { id: sessaoId },
        status: StatusFilaCuidados.EM_ATENDIMENTO,
      },
    });

    if (pessoasEmAtendimento > 0) {
      throw new BadRequestException('Ainda há pessoas em atendimento. Finalize todos os atendimentos antes de encerrar a sessão.');
    }

    sessao.status = StatusSessao.ENCERRADA;
    sessao.hora_fim = new Date();

    const sessaoEncerrada = await this.sessaoRepository.save(sessao);

    // Buscar estatísticas para notificação
    const estatisticas = await this.getEstatisticas(sessaoId);

    // Emitir evento WebSocket
    this.websocketGateway.emitEspacoCuidadosSessaoEncerrada(sessaoEncerrada);
    this.websocketGateway.emitEspacoCuidadosDashboardAtualizado();

    // Notificar Telegram
    await this.telegramService.notificarSessaoEncerrada(sessaoEncerrada, estatisticas);

    return sessaoEncerrada;
  }

  async getSessaoAtiva(): Promise<SessaoEspacoCuidados | null> {
    return await this.sessaoRepository.findOne({
      where: { status: StatusSessao.ATIVA },
      relations: ['fila', 'fila.pessoa'],
      order: { created_at: 'DESC' },
    });
  }

  async getSessaoPorId(sessaoId: string): Promise<SessaoEspacoCuidados> {
    const sessao = await this.sessaoRepository.findOne({
      where: { id: sessaoId },
      relations: ['fila', 'fila.pessoa'],
    });

    if (!sessao) {
      throw new NotFoundException('Sessão não encontrada');
    }

    return sessao;
  }

  // ============================================
  // GERENCIAMENTO DA FILA
  // ============================================

  async adicionarPessoaNaFila(dados: {
    pessoaId: string;
    querBanho: boolean;
    querAtendimento: boolean;
    observacoes?: string;
  }): Promise<FilaEspacoCuidados> {
    const { pessoaId, querBanho, querAtendimento, observacoes } = dados;

    // Validação
    if (!querBanho && !querAtendimento) {
      throw new BadRequestException('A pessoa deve solicitar pelo menos banho ou atendimento');
    }

    // Buscar sessão ativa
    const sessaoAtiva = await this.getSessaoAtiva();
    if (!sessaoAtiva) {
      throw new BadRequestException('Não há sessão ativa no momento');
    }

    // Verificar se a pessoa existe
    const pessoa = await this.pessoaRepository.findOne({
      where: { id: pessoaId },
    });

    if (!pessoa) {
      throw new NotFoundException('Pessoa não encontrada');
    }

    // Verificar se a pessoa já está na fila desta sessão
    const jaEstaNaFila = await this.filaRepository.findOne({
      where: {
        sessao: { id: sessaoAtiva.id },
        pessoa: { id: pessoaId },
      },
    });

    if (jaEstaNaFila) {
      throw new BadRequestException('Esta pessoa já está na fila desta sessão');
    }

    // Calcular ordem de chegada (próximo número)
    const ultimaOrdem = await this.filaRepository
      .createQueryBuilder('fila')
      .where('fila.sessao_id = :sessaoId', { sessaoId: sessaoAtiva.id })
      .select('MAX(fila.ordem_chegada)', 'max')
      .getRawOne();

    const ordemChegada = (ultimaOrdem?.max || 0) + 1;

    // Determinar status inicial
    const statusInicial: StatusFilaCuidados = querBanho 
      ? StatusFilaCuidados.AGUARDANDO_BANHO 
      : StatusFilaCuidados.AGUARDANDO_ATENDIMENTO;

    // Calcular posição na fila de banho (se aplicável)
    let posicaoBanho: number | null = null;
    if (querBanho) {
      const ultimaPosicaoBanho = await this.filaRepository
        .createQueryBuilder('fila')
        .where('fila.sessao_id = :sessaoId', { sessaoId: sessaoAtiva.id })
        .andWhere('fila.quer_banho = true')
        .select('MAX(fila.posicao_banho)', 'max')
        .getRawOne();

      posicaoBanho = (ultimaPosicaoBanho?.max || 0) + 1;
    }

    // Verificar se é novo cadastro (criado hoje)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const novoCadastro = pessoa.created_at >= hoje;

    // Criar entrada na fila
    const novaEntrada = new FilaEspacoCuidados();
    novaEntrada.sessao_id = sessaoAtiva.id;
    novaEntrada.pessoa_id = pessoaId;
    novaEntrada.ordem_chegada = ordemChegada;
    novaEntrada.quer_banho = querBanho;
    novaEntrada.quer_atendimento = querAtendimento;
    novaEntrada.posicao_banho = posicaoBanho ?? undefined;
    novaEntrada.posicao_atendimento = undefined; // Será calculado depois do banho ou imediatamente
    novaEntrada.status = statusInicial;
    novaEntrada.novo_cadastro = novoCadastro;
    novaEntrada.observacoes = observacoes;
    novaEntrada.hora_chegada = new Date();

    const entradaSalva = await this.filaRepository.save(novaEntrada);

    // Se não quer banho, calcular posição no atendimento agora
    if (!querBanho && querAtendimento) {
      entradaSalva.posicao_atendimento = await this.calcularPosicaoAtendimento(sessaoAtiva.id);
      await this.filaRepository.save(entradaSalva);
    }

    const resultado = await this.filaRepository.findOne({
      where: { id: entradaSalva.id },
      relations: ['pessoa', 'sessao'],
    });

    if (!resultado) {
      throw new Error('Erro ao buscar entrada recém-criada');
    }

    // Emitir evento WebSocket
    this.websocketGateway.emitEspacoCuidadosPessoaAdicionada(resultado);
    this.websocketGateway.emitEspacoCuidadosDashboardAtualizado();

    // Notificar Telegram
    await this.telegramService.notificarPessoaAdicionada(resultado);

    return resultado;
  }

  // ============================================
  // FLUXO DE BANHO
  // ============================================

  async iniciarBanho(filaId: string): Promise<FilaEspacoCuidados> {
    const entrada = await this.filaRepository.findOne({
      where: { id: filaId },
      relations: ['pessoa', 'sessao'],
    });

    if (!entrada) {
      throw new NotFoundException('Entrada na fila não encontrada');
    }

    if (!entrada.quer_banho) {
      throw new BadRequestException('Esta pessoa não solicitou banho');
    }

    if (entrada.status !== StatusFilaCuidados.AGUARDANDO_BANHO) {
      throw new BadRequestException('Status inválido para iniciar banho');
    }

    entrada.status = StatusFilaCuidados.EM_BANHO;
    entrada.hora_inicio_banho = new Date();

    const entradaAtualizada = await this.filaRepository.save(entrada);

    // Emitir evento WebSocket
    this.websocketGateway.emitEspacoCuidadosStatusAtualizado(entradaAtualizada);
    this.websocketGateway.emitEspacoCuidadosDashboardAtualizado();

    return entradaAtualizada;
  }

  async finalizarBanho(filaId: string): Promise<FilaEspacoCuidados> {
    const entrada = await this.filaRepository.findOne({
      where: { id: filaId },
      relations: ['pessoa', 'sessao'],
    });

    if (!entrada) {
      throw new NotFoundException('Entrada na fila não encontrada');
    }

    if (entrada.status !== StatusFilaCuidados.EM_BANHO) {
      throw new BadRequestException('Status inválido para finalizar banho');
    }

    entrada.hora_fim_banho = new Date();

    // Se também quer atendimento, ir para fila de atendimento
    if (entrada.quer_atendimento) {
      entrada.status = StatusFilaCuidados.AGUARDANDO_ATENDIMENTO;
      entrada.posicao_atendimento = await this.calcularPosicaoAtendimento(entrada.sessao.id);
    } else {
      // Se não quer atendimento, marcar como concluído
      entrada.status = StatusFilaCuidados.CONCLUIDO;
    }

    const entradaAtualizada = await this.filaRepository.save(entrada);

    // Emitir evento WebSocket
    this.websocketGateway.emitEspacoCuidadosStatusAtualizado(entradaAtualizada);
    this.websocketGateway.emitEspacoCuidadosDashboardAtualizado();

    return entradaAtualizada;
  }

  // ============================================
  // FLUXO DE ATENDIMENTO
  // ============================================

  async iniciarAtendimento(filaId: string): Promise<FilaEspacoCuidados> {
    const entrada = await this.filaRepository.findOne({
      where: { id: filaId },
      relations: ['pessoa', 'sessao'],
    });

    if (!entrada) {
      throw new NotFoundException('Entrada na fila não encontrada');
    }

    if (!entrada.quer_atendimento) {
      throw new BadRequestException('Esta pessoa não solicitou atendimento');
    }

    if (entrada.status !== StatusFilaCuidados.AGUARDANDO_ATENDIMENTO) {
      throw new BadRequestException('Status inválido para iniciar atendimento');
    }

    entrada.status = StatusFilaCuidados.EM_ATENDIMENTO;
    entrada.hora_inicio_atendimento = new Date();

    const entradaAtualizada = await this.filaRepository.save(entrada);

    // Emitir evento WebSocket
    this.websocketGateway.emitEspacoCuidadosStatusAtualizado(entradaAtualizada);
    this.websocketGateway.emitEspacoCuidadosDashboardAtualizado();

    return entradaAtualizada;
  }

  async finalizarAtendimento(filaId: string): Promise<FilaEspacoCuidados> {
    const entrada = await this.filaRepository.findOne({
      where: { id: filaId },
      relations: ['pessoa', 'sessao'],
    });

    if (!entrada) {
      throw new NotFoundException('Entrada na fila não encontrada');
    }

    if (entrada.status !== StatusFilaCuidados.EM_ATENDIMENTO) {
      throw new BadRequestException('Status inválido para finalizar atendimento');
    }

    entrada.status = StatusFilaCuidados.CONCLUIDO;
    entrada.hora_fim_atendimento = new Date();

    const entradaAtualizada = await this.filaRepository.save(entrada);

    // ============================================
    // 🆕 CRIAR PRONTUÁRIO AUTOMÁTICO
    // ============================================
    const CRIAR_PRONTUARIO_AUTOMATICO = process.env.ESPACO_CUIDADOS_CRIAR_PRONTUARIO !== 'false'; // padrão: true

    if (CRIAR_PRONTUARIO_AUTOMATICO) {
      try {
        await this.prontuariosService.criarProntuarioEspacoCuidados({
          pessoa_id: entrada.pessoa_id,
          sessao_id: entrada.sessao_id,
          data_atendimento: entrada.sessao.data_sessao,
          equipe: entrada.sessao.equipe,
          servicos: {
            banho: entrada.quer_banho,
            atendimento: entrada.quer_atendimento,
          },
          tempos: {
            chegada: entrada.hora_chegada,
            inicio_banho: entrada.hora_inicio_banho,
            fim_banho: entrada.hora_fim_banho,
            inicio_atendimento: entrada.hora_inicio_atendimento,
            fim_atendimento: entrada.hora_fim_atendimento,
          },
          observacoes: entrada.observacoes,
          novo_cadastro: entrada.novo_cadastro,
          vezes_passou_vez: entrada.vezes_passou_vez,
        });
        console.log(`✅ Prontuário criado automaticamente para pessoa ${entrada.pessoa_id}`);
      } catch (error) {
        console.error('❌ Erro ao criar prontuário automático:', error);
        // Não bloqueia o fluxo se houver erro no prontuário
      }
    }

    // Emitir evento WebSocket
    this.websocketGateway.emitEspacoCuidadosStatusAtualizado(entradaAtualizada);
    this.websocketGateway.emitEspacoCuidadosDashboardAtualizado();

    return entradaAtualizada;
  }

  // ============================================
  // PASSAR A VEZ
  // ============================================

  async passarVez(filaId: string, tipo: 'banho' | 'atendimento'): Promise<FilaEspacoCuidados> {
    const entrada = await this.filaRepository.findOne({
      where: { id: filaId },
      relations: ['pessoa', 'sessao'],
    });

    if (!entrada) {
      throw new NotFoundException('Entrada na fila não encontrada');
    }

    // Validar status conforme o tipo
    if (tipo === 'banho' && entrada.status !== StatusFilaCuidados.AGUARDANDO_BANHO) {
      throw new BadRequestException('Status inválido para passar vez no banho');
    }

    if (tipo === 'atendimento' && entrada.status !== StatusFilaCuidados.AGUARDANDO_ATENDIMENTO) {
      throw new BadRequestException('Status inválido para passar vez no atendimento');
    }

    // Incrementar contador
    entrada.vezes_passou_vez += 1;

    // Reorganizar posição (ir para o final da fila)
    if (tipo === 'banho' && entrada.posicao_banho) {
      const ultimaPosicao = await this.filaRepository
        .createQueryBuilder('fila')
        .where('fila.sessao_id = :sessaoId', { sessaoId: entrada.sessao.id })
        .andWhere('fila.quer_banho = true')
        .andWhere('fila.status = :status', { status: StatusFilaCuidados.AGUARDANDO_BANHO })
        .select('MAX(fila.posicao_banho)', 'max')
        .getRawOne();

      entrada.posicao_banho = (ultimaPosicao?.max || 0) + 1;
    }

    if (tipo === 'atendimento' && entrada.posicao_atendimento) {
      const ultimaPosicao = await this.filaRepository
        .createQueryBuilder('fila')
        .where('fila.sessao_id = :sessaoId', { sessaoId: entrada.sessao.id })
        .andWhere('fila.quer_atendimento = true')
        .andWhere('fila.status = :status', { status: StatusFilaCuidados.AGUARDANDO_ATENDIMENTO })
        .select('MAX(fila.posicao_atendimento)', 'max')
        .getRawOne();

      entrada.posicao_atendimento = (ultimaPosicao?.max || 0) + 1;
    }

    const entradaAtualizada = await this.filaRepository.save(entrada);

    // Emitir evento WebSocket
    this.websocketGateway.emitEspacoCuidadosPassouVez(entradaAtualizada);
    this.websocketGateway.emitEspacoCuidadosDashboardAtualizado();

    // Alertar Telegram se passou 3x ou mais
    if (entradaAtualizada.vezes_passou_vez >= 3) {
      await this.telegramService.alertarPassouVez3x(entradaAtualizada, tipo);
    }

    return entradaAtualizada;
  }

  async marcarDesistencia(filaId: string): Promise<FilaEspacoCuidados> {
    const entrada = await this.filaRepository.findOne({
      where: { id: filaId },
      relations: ['pessoa', 'sessao'],
    });

    if (!entrada) {
      throw new NotFoundException('Entrada na fila não encontrada');
    }

    entrada.status = StatusFilaCuidados.DESISTIU;

    return await this.filaRepository.save(entrada);
  }

  // ============================================
  // CONSULTAS
  // ============================================

  async getFilaAtual(sessaoId: string): Promise<FilaEspacoCuidados[]> {
    return await this.filaRepository.find({
      where: { sessao: { id: sessaoId } },
      relations: ['pessoa'],
      order: { ordem_chegada: 'ASC' },
    });
  }

  async getFilaBanho(sessaoId: string): Promise<FilaEspacoCuidados[]> {
    return await this.filaRepository.find({
      where: { 
        sessao: { id: sessaoId },
        quer_banho: true,
        status: StatusFilaCuidados.AGUARDANDO_BANHO,
      },
      relations: ['pessoa'],
      order: { posicao_banho: 'ASC' },
    });
  }

  async getFilaAtendimento(sessaoId: string): Promise<FilaEspacoCuidados[]> {
    return await this.filaRepository.find({
      where: { 
        sessao: { id: sessaoId },
        quer_atendimento: true,
        status: StatusFilaCuidados.AGUARDANDO_ATENDIMENTO,
      },
      relations: ['pessoa'],
      order: { posicao_atendimento: 'ASC' },
    });
  }

  async getEstatisticas(sessaoId: string) {
    const sessao = await this.getSessaoPorId(sessaoId);
    
    const total = await this.filaRepository.count({
      where: { sessao: { id: sessaoId } },
    });

    const aguardandoBanho = await this.filaRepository.count({
      where: { 
        sessao: { id: sessaoId },
        status: StatusFilaCuidados.AGUARDANDO_BANHO,
      },
    });

    const emBanho = await this.filaRepository.count({
      where: { 
        sessao: { id: sessaoId },
        status: StatusFilaCuidados.EM_BANHO,
      },
    });

    const aguardandoAtendimento = await this.filaRepository.count({
      where: { 
        sessao: { id: sessaoId },
        status: StatusFilaCuidados.AGUARDANDO_ATENDIMENTO,
      },
    });

    const emAtendimento = await this.filaRepository.count({
      where: { 
        sessao: { id: sessaoId },
        status: StatusFilaCuidados.EM_ATENDIMENTO,
      },
    });

    const concluidos = await this.filaRepository.count({
      where: { 
        sessao: { id: sessaoId },
        status: StatusFilaCuidados.CONCLUIDO,
      },
    });

    const desistencias = await this.filaRepository.count({
      where: { 
        sessao: { id: sessaoId },
        status: StatusFilaCuidados.DESISTIU,
      },
    });

    const novosCadastros = await this.filaRepository.count({
      where: { 
        sessao: { id: sessaoId },
        novo_cadastro: true,
      },
    });

    // Calcular tempo médio de espera e atendimento
    const entradas = await this.filaRepository.find({
      where: { sessao: { id: sessaoId } },
    });

    let tempoMedioBanho = 0;
    let tempoMedioAtendimento = 0;
    let tempoMedioEspera = 0;

    const banhosConcluidos = entradas.filter(e => e.hora_inicio_banho && e.hora_fim_banho);
    if (banhosConcluidos.length > 0) {
      const totalMinutosBanho = banhosConcluidos.reduce((acc, e) => {
        const duracao = e.duracaoBanhoMinutos;
        return acc + (duracao || 0);
      }, 0);
      tempoMedioBanho = Math.round(totalMinutosBanho / banhosConcluidos.length);
    }

    const atendimentosConcluidos = entradas.filter(e => e.hora_inicio_atendimento && e.hora_fim_atendimento);
    if (atendimentosConcluidos.length > 0) {
      const totalMinutosAtendimento = atendimentosConcluidos.reduce((acc, e) => {
        const duracao = e.duracaoAtendimentoMinutos;
        return acc + (duracao || 0);
      }, 0);
      tempoMedioAtendimento = Math.round(totalMinutosAtendimento / atendimentosConcluidos.length);
    }

    const emEspera = entradas.filter(e => 
      e.status === StatusFilaCuidados.AGUARDANDO_BANHO || 
      e.status === StatusFilaCuidados.AGUARDANDO_ATENDIMENTO
    );
    if (emEspera.length > 0) {
      const totalMinutosEspera = emEspera.reduce((acc, e) => acc + e.tempoEsperaMinutos, 0);
      tempoMedioEspera = Math.round(totalMinutosEspera / emEspera.length);
    }

    return {
      sessao: {
        id: sessao.id,
        data: sessao.data_sessao,
        status: sessao.status,
        hora_inicio: sessao.hora_inicio,
        hora_fim: sessao.hora_fim,
        equipe: sessao.equipe,
      },
      contadores: {
        total,
        aguardandoBanho,
        emBanho,
        aguardandoAtendimento,
        emAtendimento,
        concluidos,
        desistencias,
        novosCadastros,
      },
      tempos: {
        medioBanhoMinutos: tempoMedioBanho,
        medioAtendimentoMinutos: tempoMedioAtendimento,
        medioEsperaMinutos: tempoMedioEspera,
      },
    };
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  private async calcularPosicaoAtendimento(sessaoId: string): Promise<number> {
    const ultimaPosicao = await this.filaRepository
      .createQueryBuilder('fila')
      .where('fila.sessao_id = :sessaoId', { sessaoId })
      .andWhere('fila.quer_atendimento = true')
      .andWhere('fila.status = :status', { status: StatusFilaCuidados.AGUARDANDO_ATENDIMENTO })
      .select('MAX(fila.posicao_atendimento)', 'max')
      .getRawOne();

    return (ultimaPosicao?.max || 0) + 1;
  }

  // ============================================
  // DASHBOARD COMPLETO
  // ============================================

  async getDashboard() {
    const sessaoAtiva = await this.getSessaoAtiva();
    
    if (!sessaoAtiva) {
      return {
        sessao: null,
        estatisticas: null,
        filas: { banho: [], atendimento: [] },
      };
    }

    const estatisticas = await this.getEstatisticas(sessaoAtiva.id);
    const filaBanho = await this.getFilaBanho(sessaoAtiva.id);
    const filaAtendimento = await this.getFilaAtendimento(sessaoAtiva.id);

    return {
      sessao: sessaoAtiva,
      estatisticas,
      filas: {
        banho: filaBanho,
        atendimento: filaAtendimento,
      },
    };
  }

  // ============================================
  // HISTÓRICO DE SESSÕES
  // ============================================

  async getHistoricoSessoes(filters?: {
    limit?: number;
    offset?: number;
    status?: StatusSessao;
  }): Promise<{ sessoes: any[]; total: number }> {
    const query = this.sessaoRepository
      .createQueryBuilder('sessao')
      .orderBy('sessao.data_sessao', 'DESC');

    if (filters?.status) {
      query.andWhere('sessao.status = :status', { status: filters.status });
    }

    const total = await query.getCount();

    if (filters?.limit) {
      query.take(filters.limit);
    }

    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const sessoes = await query.getMany();

    // Buscar estatísticas para cada sessão
    const sessoesComEstatisticas = await Promise.all(
      sessoes.map(async (sessao) => {
        const estatisticas = await this.getEstatisticas(sessao.id);
        return {
          ...sessao,
          estatisticas,
        };
      })
    );

    return {
      sessoes: sessoesComEstatisticas,
      total,
    };
  }

  // ============================================
  // ANALYTICS COMPARATIVOS
  // ============================================

  async getAnalyticsComparativo(sessaoIds?: string[]): Promise<any> {
    let query = this.sessaoRepository
      .createQueryBuilder('sessao')
      .where('sessao.status = :status', { status: StatusSessao.ENCERRADA })
      .orderBy('sessao.data_sessao', 'DESC')
      .take(sessaoIds ? sessaoIds.length : 10);

    if (sessaoIds && sessaoIds.length > 0) {
      query = query.andWhere('sessao.id IN (:...ids)', { ids: sessaoIds });
    }

    const sessoes = await query.getMany();

    const comparativo = await Promise.all(
      sessoes.map(async (sessao) => {
        const estatisticas = await this.getEstatisticas(sessao.id);
        return {
          sessao_id: sessao.id,
          data: sessao.data_sessao,
          equipe: sessao.equipe,
          duracao_minutos: sessao.hora_fim && sessao.hora_inicio
            ? Math.round((sessao.hora_fim.getTime() - sessao.hora_inicio.getTime()) / 60000)
            : null,
          contadores: estatisticas.contadores,
          tempos_medios: {
            banho: estatisticas.tempos.medioBanhoMinutos,
            atendimento: estatisticas.tempos.medioAtendimentoMinutos,
            total: estatisticas.tempos.medioEsperaMinutos,
          },
          indicadores: {
            taxa_conclusao: estatisticas.contadores.total > 0
              ? Math.round((estatisticas.contadores.concluidos / estatisticas.contadores.total) * 100)
              : 0,
            taxa_novos_cadastros: estatisticas.contadores.total > 0
              ? Math.round((estatisticas.contadores.novosCadastros / estatisticas.contadores.total) * 100)
              : 0,
            pessoas_por_hora: sessao.hora_fim && sessao.hora_inicio
              ? (estatisticas.contadores.concluidos / ((sessao.hora_fim.getTime() - sessao.hora_inicio.getTime()) / 3600000)).toFixed(1)
              : 0,
          },
        };
      })
    );

    // Calcular médias gerais
    const totais = comparativo.reduce(
      (acc, item) => ({
        total_atendimentos: acc.total_atendimentos + item.contadores.concluidos,
        total_banhos: acc.total_banhos + item.contadores.emBanho,
        total_atendimentos_sociais: acc.total_atendimentos_sociais + item.contadores.emAtendimento,
        total_novos_cadastros: acc.total_novos_cadastros + item.contadores.novosCadastros,
        soma_tempo_banho: acc.soma_tempo_banho + (item.tempos_medios.banho || 0),
        soma_tempo_atendimento: acc.soma_tempo_atendimento + (item.tempos_medios.atendimento || 0),
        contagem_tempos_banho: acc.contagem_tempos_banho + (item.tempos_medios.banho ? 1 : 0),
        contagem_tempos_atendimento: acc.contagem_tempos_atendimento + (item.tempos_medios.atendimento ? 1 : 0),
      }),
      {
        total_atendimentos: 0,
        total_banhos: 0,
        total_atendimentos_sociais: 0,
        total_novos_cadastros: 0,
        soma_tempo_banho: 0,
        soma_tempo_atendimento: 0,
        contagem_tempos_banho: 0,
        contagem_tempos_atendimento: 0,
      }
    );

    return {
      sessoes: comparativo,
      resumo: {
        quantidade_sessoes: comparativo.length,
        total_atendimentos: totais.total_atendimentos,
        total_banhos: totais.total_banhos,
        total_atendimentos_sociais: totais.total_atendimentos_sociais,
        total_novos_cadastros: totais.total_novos_cadastros,
        medias: {
          atendimentos_por_sessao: totais.total_atendimentos / comparativo.length,
          tempo_banho: totais.contagem_tempos_banho > 0
            ? Math.round(totais.soma_tempo_banho / totais.contagem_tempos_banho)
            : null,
          tempo_atendimento: totais.contagem_tempos_atendimento > 0
            ? Math.round(totais.soma_tempo_atendimento / totais.contagem_tempos_atendimento)
            : null,
        },
      },
    };
  }

  // ============================================
  // TENDÊNCIAS (ÚLTIMOS N DIAS)
  // ============================================

  async getTendencias(options?: {
    dias?: number;
    tipo?: 'atendimentos' | 'tempos' | 'novos_cadastros';
  }): Promise<any> {
    const dias = options?.dias || 30;
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    const sessoes = await this.sessaoRepository
      .createQueryBuilder('sessao')
      .where('sessao.data_sessao >= :dataInicio', { dataInicio })
      .andWhere('sessao.status = :status', { status: StatusSessao.ENCERRADA })
      .orderBy('sessao.data_sessao', 'ASC')
      .getMany();

    const tendencias = await Promise.all(
      sessoes.map(async (sessao) => {
        const estatisticas = await this.getEstatisticas(sessao.id);
        return {
          data: sessao.data_sessao,
          atendimentos: estatisticas.contadores.concluidos,
          banhos: estatisticas.contadores.emBanho,
          atendimentos_sociais: estatisticas.contadores.emAtendimento,
          novos_cadastros: estatisticas.contadores.novosCadastros,
          tempo_medio_banho: estatisticas.tempos.medioBanhoMinutos,
          tempo_medio_atendimento: estatisticas.tempos.medioAtendimentoMinutos,
          tempo_medio_total: estatisticas.tempos.medioEsperaMinutos,
        };
      })
    );

    return {
      periodo: {
        inicio: dataInicio,
        fim: new Date(),
        dias,
      },
      tendencias,
      metricas: this.calcularMetricasTendencia(tendencias),
    };
  }

  private calcularMetricasTendencia(dados: any[]): any {
    if (dados.length === 0) return null;

    const soma = dados.reduce(
      (acc, item) => ({
        atendimentos: acc.atendimentos + item.atendimentos,
        banhos: acc.banhos + item.banhos,
        novos_cadastros: acc.novos_cadastros + item.novos_cadastros,
      }),
      { atendimentos: 0, banhos: 0, novos_cadastros: 0 }
    );

    // Calcular tendência (comparar primeira metade vs segunda metade)
    const meio = Math.floor(dados.length / 2);
    const primeiraMetade = dados.slice(0, meio);
    const segundaMetade = dados.slice(meio);

    const mediaPrimeira = primeiraMetade.reduce((acc, item) => acc + item.atendimentos, 0) / primeiraMetade.length;
    const mediaSegunda = segundaMetade.reduce((acc, item) => acc + item.atendimentos, 0) / segundaMetade.length;

    const tendencia = mediaSegunda > mediaPrimeira ? 'crescimento' : mediaSegunda < mediaPrimeira ? 'queda' : 'estavel';
    const variacao = mediaPrimeira > 0 ? ((mediaSegunda - mediaPrimeira) / mediaPrimeira) * 100 : 0;

    return {
      totais: soma,
      medias: {
        atendimentos_por_sessao: soma.atendimentos / dados.length,
        banhos_por_sessao: soma.banhos / dados.length,
        novos_cadastros_por_sessao: soma.novos_cadastros / dados.length,
      },
      tendencia: {
        direcao: tendencia,
        variacao_percentual: Math.round(variacao),
      },
      pico: {
        data: dados.reduce((max, item) => item.atendimentos > max.atendimentos ? item : max, dados[0]).data,
        atendimentos: Math.max(...dados.map(d => d.atendimentos)),
      },
    };
  }

  // ============================================
  // REORDENAR FILA (DRAG & DROP)
  // ============================================

  async reordenarFila(sessaoId: string, ordemNova: string[]): Promise<void> {
    // ordemNova é um array de IDs na ordem desejada
    const entradas = await this.filaRepository.find({
      where: { sessao_id: sessaoId },
    });

    // Criar mapa de ID -> entrada
    const mapaEntradas = new Map(entradas.map(e => [e.id, e]));

    // Atualizar ordem_chegada baseado na nova ordem
    const atualizacoes = ordemNova.map((id, index) => {
      const entrada = mapaEntradas.get(id);
      if (entrada) {
        entrada.ordem_chegada = index + 1;
        return entrada;
      }
      return null;
    }).filter(e => e !== null);

    await this.filaRepository.save(atualizacoes);

    // Emitir WebSocket
    this.websocketGateway.emitEspacoCuidadosDashboardAtualizado();
  }
}
