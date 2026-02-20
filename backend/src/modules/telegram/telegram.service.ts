import { Injectable, OnModuleInit } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { EspacoCuidadosService } from '../espaco-cuidados/espaco-cuidados.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot | null = null;
  private readonly token: string;
  private readonly grupoEquipe: string;
  private readonly grupoCoordenacao: string;
  private readonly grupoGeral: string;

  constructor(
    private espacoCuidadosService: EspacoCuidadosService,
  ) {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '';
    this.grupoEquipe = process.env.TELEGRAM_GROUP_EQUIPE || '';
    this.grupoCoordenacao = process.env.TELEGRAM_GROUP_COORDENACAO || '';
    this.grupoGeral = process.env.TELEGRAM_GROUP_GERAL || '';
  }

  onModuleInit() {
    if (!this.token) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN não configurado. Bot Telegram desabilitado.');
      return;
    }

    try {
      this.bot = new TelegramBot(this.token, { polling: true });
      this.setupCommands();
      console.log('✅ Bot Telegram iniciado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao iniciar bot Telegram:', error);
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    // Comando /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot?.sendMessage(
        chatId,
        `🏠 *Dias da Cruz - Espaço de Cuidados*\n\n` +
        `Bem-vindo ao bot de gerenciamento!\n\n` +
        `*Comandos disponíveis:*\n` +
        `/fila - Ver fila completa\n` +
        `/banho - Ver fila de banho\n` +
        `/atendimento - Ver fila de atendimento\n` +
        `/estatisticas - Ver estatísticas da sessão\n` +
        `/ajuda - Listar comandos\n` +
        `/chatid - Ver ID deste chat`,
        { parse_mode: 'Markdown' }
      );
    });

    // Comando /ajuda
    this.bot.onText(/\/ajuda/, (msg) => {
      const chatId = msg.chat.id;
      this.bot?.sendMessage(
        chatId,
        `📚 *Comandos Disponíveis*\n\n` +
        `🔹 /fila - Ver fila completa (banho + atendimento)\n` +
        `🔹 /banho - Ver apenas fila de banho\n` +
        `🔹 /atendimento - Ver apenas fila de atendimento\n` +
        `🔹 /estatisticas - Ver estatísticas da sessão ativa\n` +
        `🔹 /ajuda - Mostrar esta mensagem\n` +
        `🔹 /chatid - Ver ID deste chat (para configuração)`,
        { parse_mode: 'Markdown' }
      );
    });

    // Comando /chatid
    this.bot.onText(/\/chatid/, (msg) => {
      const chatId = msg.chat.id;
      this.bot?.sendMessage(
        chatId,
        `🆔 *ID deste chat:* \`${chatId}\`\n\n` +
        `Use este ID nas variáveis de ambiente:\n` +
        `TELEGRAM_GROUP_EQUIPE\n` +
        `TELEGRAM_GROUP_COORDENACAO\n` +
        `TELEGRAM_GROUP_GERAL`,
        { parse_mode: 'Markdown' }
      );
    });

    // Comando /fila
    this.bot.onText(/\/fila/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleComandoFila(chatId);
    });

    // Comando /banho
    this.bot.onText(/\/banho/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleComandoBanho(chatId);
    });

    // Comando /atendimento
    this.bot.onText(/\/atendimento/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleComandoAtendimento(chatId);
    });

    // Comando /estatisticas
    this.bot.onText(/\/estatisticas/, async (msg) => {
      const chatId = msg.chat.id;
      await this.handleComandoEstatisticas(chatId);
    });
  }

  // ============================================
  // HANDLERS DE COMANDOS
  // ============================================

  private async handleComandoFila(chatId: number) {
    try {
      const dashboard = await this.espacoCuidadosService.getDashboard();

      if (!dashboard.sessao) {
        this.bot?.sendMessage(chatId, '❌ Nenhuma sessão ativa no momento.');
        return;
      }

      const { banho, atendimento } = dashboard.filas;
      const total = banho.length + atendimento.length;

      let mensagem = `📋 *FILA COMPLETA*\n\n`;
      mensagem += `📅 Sessão: ${new Date(dashboard.sessao.data_sessao).toLocaleDateString('pt-BR')}\n`;
      mensagem += `👥 Total: ${total} pessoas\n\n`;

      // Fila de Banho
      if (banho.length > 0) {
        mensagem += `🚿 *FILA DE BANHO* (${banho.length})\n`;
        banho.forEach((pessoa: any, idx: number) => {
          const emoji = pessoa.status === 'em_banho' ? '🔵' : '⚪';
          mensagem += `${emoji} ${idx + 1}. ${pessoa.pessoa.nome}`;
          if (pessoa.status === 'em_banho') mensagem += ' *(em banho)*';
          if (pessoa.vezes_passou_vez > 0) mensagem += ` ⚠️ ${pessoa.vezes_passou_vez}x`;
          mensagem += '\n';
        });
        mensagem += '\n';
      }

      // Fila de Atendimento
      if (atendimento.length > 0) {
        mensagem += `👥 *FILA DE ATENDIMENTO* (${atendimento.length})\n`;
        atendimento.forEach((pessoa: any, idx: number) => {
          const emoji = pessoa.status === 'em_atendimento' ? '🟣' : '⚪';
          mensagem += `${emoji} ${idx + 1}. ${pessoa.pessoa.nome}`;
          if (pessoa.status === 'em_atendimento') mensagem += ' *(em atendimento)*';
          if (pessoa.vezes_passou_vez > 0) mensagem += ` ⚠️ ${pessoa.vezes_passou_vez}x`;
          mensagem += '\n';
        });
      }

      if (total === 0) {
        mensagem += '✅ Fila vazia no momento.';
      }

      this.bot?.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
    } catch (error) {
      this.bot?.sendMessage(chatId, '❌ Erro ao buscar fila.');
      console.error('Erro ao buscar fila:', error);
    }
  }

  private async handleComandoBanho(chatId: number) {
    try {
      const dashboard = await this.espacoCuidadosService.getDashboard();

      if (!dashboard.sessao) {
        this.bot?.sendMessage(chatId, '❌ Nenhuma sessão ativa no momento.');
        return;
      }

      const { banho } = dashboard.filas;

      let mensagem = `🚿 *FILA DE BANHO*\n\n`;
      mensagem += `📅 Sessão: ${new Date(dashboard.sessao.data_sessao).toLocaleDateString('pt-BR')}\n`;
      mensagem += `👥 Total: ${banho.length} pessoas\n\n`;

      if (banho.length > 0) {
        banho.forEach((pessoa: any, idx: number) => {
          const emoji = pessoa.status === 'em_banho' ? '🔵' : '⚪';
          mensagem += `${emoji} ${idx + 1}. ${pessoa.pessoa.nome}`;
          if (pessoa.status === 'em_banho') mensagem += ' *(em banho)*';
          if (pessoa.vezes_passou_vez > 0) mensagem += ` ⚠️ ${pessoa.vezes_passou_vez}x`;
          if (pessoa.novo_cadastro) mensagem += ' ✨';
          mensagem += '\n';
        });
      } else {
        mensagem += '✅ Fila vazia no momento.';
      }

      this.bot?.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
    } catch (error) {
      this.bot?.sendMessage(chatId, '❌ Erro ao buscar fila de banho.');
      console.error('Erro ao buscar fila de banho:', error);
    }
  }

  private async handleComandoAtendimento(chatId: number) {
    try {
      const dashboard = await this.espacoCuidadosService.getDashboard();

      if (!dashboard.sessao) {
        this.bot?.sendMessage(chatId, '❌ Nenhuma sessão ativa no momento.');
        return;
      }

      const { atendimento } = dashboard.filas;

      let mensagem = `👥 *FILA DE ATENDIMENTO*\n\n`;
      mensagem += `📅 Sessão: ${new Date(dashboard.sessao.data_sessao).toLocaleDateString('pt-BR')}\n`;
      mensagem += `👥 Total: ${atendimento.length} pessoas\n\n`;

      if (atendimento.length > 0) {
        atendimento.forEach((pessoa: any, idx: number) => {
          const emoji = pessoa.status === 'em_atendimento' ? '🟣' : '⚪';
          mensagem += `${emoji} ${idx + 1}. ${pessoa.pessoa.nome}`;
          if (pessoa.status === 'em_atendimento') mensagem += ' *(em atendimento)*';
          if (pessoa.vezes_passou_vez > 0) mensagem += ` ⚠️ ${pessoa.vezes_passou_vez}x`;
          if (pessoa.novo_cadastro) mensagem += ' ✨';
          mensagem += '\n';
        });
      } else {
        mensagem += '✅ Fila vazia no momento.';
      }

      this.bot?.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
    } catch (error) {
      this.bot?.sendMessage(chatId, '❌ Erro ao buscar fila de atendimento.');
      console.error('Erro ao buscar fila de atendimento:', error);
    }
  }

  private async handleComandoEstatisticas(chatId: number) {
    try {
      const dashboard = await this.espacoCuidadosService.getDashboard();

      if (!dashboard.sessao) {
        this.bot?.sendMessage(chatId, '❌ Nenhuma sessão ativa no momento.');
        return;
      }

      const { estatisticas } = dashboard;
      
      if (!estatisticas) {
        this.bot?.sendMessage(chatId, '❌ Erro ao buscar estatísticas.');
        return;
      }
      
      const { contadores, tempos } = estatisticas;

      let mensagem = `📊 *ESTATÍSTICAS DA SESSÃO*\n\n`;
      mensagem += `📅 Data: ${new Date(estatisticas.sessao.data).toLocaleDateString('pt-BR')}\n`;
      mensagem += `⏰ Início: ${estatisticas.sessao.hora_inicio ? new Date(estatisticas.sessao.hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}\n`;
      mensagem += `👥 Equipe: ${estatisticas.sessao.equipe.join(', ')}\n\n`;

      mensagem += `*📈 CONTADORES*\n`;
      mensagem += `• Total: ${contadores.total}\n`;
      mensagem += `• Aguardando banho: ${contadores.aguardandoBanho}\n`;
      mensagem += `• Em banho: ${contadores.emBanho}\n`;
      mensagem += `• Aguardando atendimento: ${contadores.aguardandoAtendimento}\n`;
      mensagem += `• Em atendimento: ${contadores.emAtendimento}\n`;
      mensagem += `• ✅ Concluídos: ${contadores.concluidos}\n`;
      mensagem += `• ❌ Desistências: ${contadores.desistencias}\n`;
      mensagem += `• ✨ Novos cadastros: ${contadores.novosCadastros}\n\n`;

      mensagem += `*⏱️ TEMPOS MÉDIOS*\n`;
      mensagem += `• Banho: ${tempos.medioBanhoMinutos} min\n`;
      mensagem += `• Atendimento: ${tempos.medioAtendimentoMinutos} min\n`;
      mensagem += `• Espera: ${tempos.medioEsperaMinutos} min\n`;

      this.bot?.sendMessage(chatId, mensagem, { parse_mode: 'Markdown' });
    } catch (error) {
      this.bot?.sendMessage(chatId, '❌ Erro ao buscar estatísticas.');
      console.error('Erro ao buscar estatísticas:', error);
    }
  }

  // ============================================
  // NOTIFICAÇÕES AUTOMÁTICAS
  // ============================================

  async notificarSessaoIniciada(sessao: any) {
    if (!this.bot) return;

    const mensagem =
      `🟢 *SESSÃO INICIADA*\n\n` +
      `📅 Data: ${new Date(sessao.data_sessao).toLocaleDateString('pt-BR')}\n` +
      `⏰ Horário: ${new Date(sessao.hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
      `👥 Equipe: ${sessao.equipe.join(', ')}\n\n` +
      `A sessão do Espaço de Cuidados está ativa!\n` +
      `Use /fila para ver a fila atual.`;

    await this.enviarParaTodosGrupos(mensagem);
  }

  async notificarSessaoEncerrada(sessao: any, estatisticas: any) {
    if (!this.bot) return;

    const duracao = Math.round(
      (new Date(sessao.hora_fim).getTime() - new Date(sessao.hora_inicio).getTime()) / (1000 * 60)
    );

    const mensagem =
      `🔴 *SESSÃO ENCERRADA*\n\n` +
      `📅 Data: ${new Date(sessao.data_sessao).toLocaleDateString('pt-BR')}\n` +
      `⏰ Duração: ${duracao} minutos\n` +
      `👥 Equipe: ${sessao.equipe.join(', ')}\n\n` +
      `*📊 RESUMO:*\n` +
      `• Total atendido: ${estatisticas.contadores.total}\n` +
      `• Concluídos: ${estatisticas.contadores.concluidos}\n` +
      `• Desistências: ${estatisticas.contadores.desistencias}\n` +
      `• Novos cadastros: ${estatisticas.contadores.novosCadastros}\n\n` +
      `Obrigado pelo trabalho de hoje! 🙏`;

    await this.enviarParaTodosGrupos(mensagem);
  }

  async notificarPessoaAdicionada(entrada: any) {
    if (!this.bot || !this.grupoEquipe) return;

    const servicos = [];
    if (entrada.quer_banho) servicos.push('🚿 Banho');
    if (entrada.quer_atendimento) servicos.push('👥 Atendimento');

    const mensagem =
      `➕ *PESSOA ADICIONADA*\n\n` +
      `👤 Nome: ${entrada.pessoa.nome}\n` +
      `📋 Ordem: ${entrada.ordem_chegada}º\n` +
      `🎯 Serviços: ${servicos.join(' + ')}\n` +
      (entrada.novo_cadastro ? `✨ Novo cadastro\n` : '') +
      (entrada.observacoes ? `📝 Obs: ${entrada.observacoes}\n` : '');

    await this.bot.sendMessage(this.grupoEquipe, mensagem, { parse_mode: 'Markdown' });
  }

  async alertarPassouVez3x(entrada: any, tipo: string) {
    if (!this.bot || !this.grupoEquipe) return;

    const tipoTexto = tipo === 'banho' ? '🚿 Banho' : '👥 Atendimento';

    const mensagem =
      `⚠️ *ALERTA: PASSOU VEZ 3x*\n\n` +
      `👤 Pessoa: ${entrada.pessoa.nome}\n` +
      `🔄 Fila: ${tipoTexto}\n` +
      `❗ Passou ${entrada.vezes_passou_vez}x a vez\n\n` +
      `Por favor, verificar a situação com a pessoa.`;

    await this.bot.sendMessage(this.grupoEquipe, mensagem, { parse_mode: 'Markdown' });
  }

  async alertarFilaBanhoVazia() {
    if (!this.bot || !this.grupoEquipe) return;

    const mensagem =
      `✅ *FILA DE BANHO VAZIA*\n\n` +
      `A fila de banho está vazia no momento.\n` +
      `Todas as pessoas que solicitaram banho foram atendidas.`;

    await this.bot.sendMessage(this.grupoEquipe, mensagem, { parse_mode: 'Markdown' });
  }

  async alertarFilaAtendimentoVazia() {
    if (!this.bot || !this.grupoEquipe) return;

    const mensagem =
      `✅ *FILA DE ATENDIMENTO VAZIA*\n\n` +
      `A fila de atendimento está vazia no momento.\n` +
      `Todas as pessoas que solicitaram atendimento foram atendidas.`;

    await this.bot.sendMessage(this.grupoEquipe, mensagem, { parse_mode: 'Markdown' });
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  private async enviarParaTodosGrupos(mensagem: string) {
    const grupos = [this.grupoEquipe, this.grupoCoordenacao, this.grupoGeral].filter(
      (id) => id && id !== ''
    );

    for (const grupoId of grupos) {
      try {
        await this.bot?.sendMessage(grupoId, mensagem, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`Erro ao enviar mensagem para grupo ${grupoId}:`, error);
      }
    }
  }
}
