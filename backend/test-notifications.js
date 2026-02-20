import express from 'express';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3002; // Porta diferente para não conflitar
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());

// Endpoint de teste das notificações
app.post('/api/teste-notificacoes', async (req, res) => {
  try {
    const dadosRelatorio = req.body;

    console.log('📊 Testando notificações com dados:', dadosRelatorio);

    // Configurações hardcoded para teste
    const configs = [
      { tipo: 'telegram', destino: '-5008990442', nome: 'Grupo Gestão', ativo: true },
      { tipo: 'email', destino: 'pauloaugus231@icloud.com', nome: 'Paulo iCloud', ativo: true }
    ];

    const notificacoes = configs.map(async (config) => {
      if (config.tipo === 'telegram') {
        const message = `🌙 *Relatório Final da Triagem*\n\n📊 **Total:** ${dadosRelatorio.total}\n👨 **Masculino:** ${dadosRelatorio.masc}\n👩 **Feminino:** ${dadosRelatorio.fem}\n👴 **Idosos:** ${dadosRelatorio.idosos}\n❌ **Ausentes:** ${dadosRelatorio.ausentes}\n\n📅 Data: ${dadosRelatorio.data}`;

        console.log(`📤 Enviando Telegram para ${config.destino}...`);

        return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.destino,
            text: message,
            parse_mode: 'Markdown'
          }),
        });
      } else if (config.tipo === 'email') {
        console.log(`📤 Enviando Email para ${config.destino}...`);

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1F2937; text-align: center;">🌙 Relatório Final da Triagem</h1>
            <div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #E5E7EB;">
                  <th style="padding: 12px; text-align: left; border: 1px solid #D1D5DB;">Categoria</th>
                  <th style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">Quantidade</th>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Total de Pessoas</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB; font-weight: bold;">${dadosRelatorio.total}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Masculino</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${dadosRelatorio.masc}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Feminino</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${dadosRelatorio.fem}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #D1D5DB;">Idosos</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB;">${dadosRelatorio.idosos}</td>
                </tr>
                <tr style="background-color: #FEF3C7;">
                  <td style="padding: 12px; border: 1px solid #D1D5DB; font-weight: bold;">Ausentes</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #D1D5DB; font-weight: bold; color: #DC2626;">${dadosRelatorio.ausentes}</td>
                </tr>
              </table>
            </div>
            <p style="text-align: center; color: #6B7280; margin-top: 20px;">
              📅 Data do relatório: <strong>${dadosRelatorio.data}</strong>
            </p>
          </div>
        `;

        return resend.emails.send({
          from: 'noreply@exemplo.com',
          to: config.destino,
          subject: '🌙 Relatório Final da Triagem - ' + dadosRelatorio.data,
          html,
        });
      }
    });

    const resultados = await Promise.allSettled(notificacoes);

    // Log dos resultados
    const sucesso = [];
    const falhas = [];

    resultados.forEach((resultado, index) => {
      const config = configs[index];
      if (resultado.status === 'fulfilled') {
        console.log(`✅ Notificação enviada com sucesso para ${config.nome} (${config.tipo})`);
        sucesso.push(`${config.tipo} para ${config.nome}`);
      } else {
        console.error(`❌ Erro ao enviar notificação para ${config.nome} (${config.tipo}):`, resultado.reason);
        falhas.push(`${config.tipo} para ${config.nome}: ${resultado.reason}`);
      }
    });

    res.json({
      success: falhas.length === 0,
      message: `Processamento concluído: ${sucesso.length} sucesso(s), ${falhas.length} falha(s)`,
      sucesso,
      falhas
    });

  } catch (error) {
    console.error('Erro geral:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${port}`);
  console.log(`📡 Telegram Token: ${process.env.TELEGRAM_TOKEN ? 'Configurado' : 'Não configurado'}`);
  console.log(`📧 Resend API Key: ${process.env.RESEND_API_KEY ? 'Configurada' : 'Não configurada'}`);
});
