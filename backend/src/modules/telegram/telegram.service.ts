import { Injectable } from '@nestjs/common';

@Injectable()
export class TelegramService {
  private get botToken() { return process.env.TELEGRAM_BOT_TOKEN; }
  private get groupId() { return process.env.TELEGRAM_GROUP_COORDENACAO; }

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
