import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:3001/api';

// Teste do endpoint de encerramento
async function testEncerramento() {
  console.log('🧪 Testando endpoint de encerramento da triagem...');

  // IDs de teste (substitua por IDs reais de pessoas ausentes)
  const ausentesIds = ['test-id-1', 'test-id-2']; // Substitua por IDs reais

  try {
    const response = await fetch(`${API_BASE}/triagem/encerrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ausentesIds),
    });

    const result = await response.json();

    console.log('📊 Resultado do encerramento:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Encerramento realizado com sucesso!');
    } else {
      console.log('❌ Erro no encerramento:', result.message);
    }

  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

// Teste do endpoint de notificações
async function testNotificacoes() {
  console.log('🔔 Testando endpoint de notificações...');

  const dadosRelatorio = {
    total: 85,
    masc: 45,
    fem: 40,
    idosos: 15,
    ausentes: 5,
    data: new Date().toLocaleDateString('pt-BR'),
  };

  try {
    const response = await fetch(`${API_BASE}/triagem/notificar-encerramento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dadosRelatorio),
    });

    const result = await response.json();

    console.log('📊 Resultado das notificações:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Notificações enviadas com sucesso!');
    } else {
      console.log('❌ Erro nas notificações:', result.message);
    }

  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

// Executar testes
async function runTests() {
  console.log('🚀 Iniciando testes...\n');

  // Teste 1: Encerramento
  await testEncerramento();
  console.log('\n' + '='.repeat(50) + '\n');

  // Teste 2: Notificações
  await testNotificacoes();

  console.log('\n✨ Testes concluídos!');
}

runTests().catch(console.error);
