import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramService {
  private get botToken() { return process.env.TELEGRAM_BOT_TOKEN; }
  private get groupId() { return process.env.TELEGRAM_GROUP_COORDENACAO; }

  /**
   * Template padrão de mensagem para todas as notificações da coordenação.
   * Estrutura fixa: título em negrito, corpo (opcional), rodapé com hora/data.
   * Sem emojis — tom institucional. Mantém todas as notificações com a mesma identidade.
   */
  formatarMensagem(titulo: string, linhas: Array<string | undefined>, rodape: string): string {
    const corpo = linhas.filter(linha => linha !== undefined && linha !== null).join('\n');
    const partes = [`*${titulo}*`];
    if (corpo) partes.push('', corpo);
    partes.push('', rodape);
    return partes.join('\n');
  }

  /**
   * Escapa os caracteres especiais do Markdown "legado" do Telegram (_ * ` [) em
   * texto vindo de cadastro — nome, nome social, gênero, raça etc. Sem isso, um
   * nome com underline ou asterisco quebra o envio inteiro (o Telegram rejeita a
   * mensagem). Usar em todo valor dinâmico interpolado numa mensagem; nunca na
   * sintaxe de formatação que a própria mensagem usa de propósito (o *negrito*
   * do título, por exemplo).
   */
  escapeMarkdown(valor: unknown): string {
    return String(valor ?? '').replace(/([_*`\[])/g, '\\$1');
  }

  async sendMessage(text: string): Promise<boolean> {
    if (!this.botToken || !this.groupId) return false;
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.groupId,
            text,
            parse_mode: 'Markdown',
          }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
