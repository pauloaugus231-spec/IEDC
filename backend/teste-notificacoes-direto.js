import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testarNotificacoes() {
  const dadosRelatorio = {
    total: 15,
    masc: 8,
    fem: 5,
    idosos: 3,
    ausentes: 2,
    data: "24/12/2025"
  };

  console.log('🚀 Iniciando teste de notificações...\n');

  // Configurações hardcoded para teste
  const configs = [
    { tipo: 'telegram', destino: '-5008990442', nome: 'Grupo Gestão', ativo: true },
    { tipo: 'email', destino: 'pauloaugus231@icloud.com', nome: 'Paulo iCloud', ativo: true }
  ];

  console.log('📊 Dados do relatório:');
  console.log(JSON.stringify(dadosRelatorio, null, 2));
  console.log('\n📤 Enviando notificações...\n');

  const notificacoes = configs.map(async (config) => {
    if (config.tipo === 'telegram') {
      const message = `🌙 *Relatório Final da Triagem*\n\n📊 **Total:** ${dadosRelatorio.total}\n👨 **Masculino:** ${dadosRelatorio.masc}\n👩 **Feminino:** ${dadosRelatorio.fem}\n👴 **Idosos:** ${dadosRelatorio.idosos}\n❌ **Ausentes:** ${dadosRelatorio.ausentes}\n\n📅 Data: ${dadosRelatorio.data}`;

      console.log(`📱 Enviando Telegram para ${config.destino}...`);

      try {
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.destino,
            text: message,
            parse_mode: 'Markdown'
          }),
        });

        if (response.ok) {
          console.log(`✅ Telegram enviado com sucesso para ${config.nome}`);
          return { success: true, tipo: 'telegram', destino: config.destino };
        } else {
          const error = await response.text();
          console.log(`❌ Erro no Telegram para ${config.nome}: ${error}`);
          return { success: false, tipo: 'telegram', destino: config.destino, error };
        }
      } catch (error) {
        console.log(`❌ Erro de rede no Telegram para ${config.nome}: ${error.message}`);
        return { success: false, tipo: 'telegram', destino: config.destino, error: error.message };
      }
    } else if (config.tipo === 'email') {
      console.log(`📧 Enviando Email para ${config.destino}...`);

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

      try {
        const result = await resend.emails.send({
          from: 'noreply@exemplo.com',
          to: config.destino,
          subject: '🌙 Relatório Final da Triagem - ' + dadosRelatorio.data,
          html,
        });

        console.log(`✅ Email enviado com sucesso para ${config.nome}`);
        return { success: true, tipo: 'email', destino: config.destino, id: result.id };
      } catch (error) {
        console.log(`❌ Erro no Email para ${config.nome}: ${error.message}`);
        return { success: false, tipo: 'email', destino: config.destino, error: error.message };
      }
    }
  });

  const resultados = await Promise.allSettled(notificacoes);

  console.log('\n📋 Resumo final:');
  const sucesso = resultados.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const falhas = resultados.length - sucesso;

  console.log(`✅ Sucessos: ${sucesso}`);
  console.log(`❌ Falhas: ${falhas}`);

  if (falhas > 0) {
    console.log('\n🔍 Detalhes das falhas:');
    resultados.forEach((resultado, index) => {
      if (resultado.status === 'rejected' || !resultado.value.success) {
        console.log(`- ${configs[index].tipo} para ${configs[index].nome}: ${resultado.status === 'rejected' ? resultado.reason : resultado.value.error}`);
      }
    });
  }

  console.log('\n🎉 Teste concluído!');
}

// Executar o teste
testarNotificacoes().catch(console.error);
