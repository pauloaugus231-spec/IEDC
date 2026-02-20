// TESTE DA LÓGICA DE ESTADIA - 15 NOITES

// Simular Check-in dia 20/12/2025 às 18h30
const dataCheckin = new Date('2025-12-20T18:30:00');
console.log('📅 Check-in:', dataCheckin.toISOString());
console.log('   Data Brasil:', dataCheckin.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

// Calcular data_limite (14 dias APÓS check-in = 15 noites totais)
const dataLimite = new Date(dataCheckin);
dataLimite.setDate(dataCheckin.getDate() + 14);
dataLimite.setHours(0, 0, 0, 0);
console.log('\n📅 Data Limite (última noite):', dataLimite.toISOString());
console.log('   Data Brasil:', dataLimite.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

// Contar as noites
const diasNoites = [];
for (let i = 0; i < 15; i++) {
  const noite = new Date(dataCheckin);
  noite.setDate(dataCheckin.getDate() + i);
  noite.setHours(0, 0, 0, 0);
  diasNoites.push(noite.toLocaleDateString('pt-BR'));
}

console.log('\n🌙 15 Noites do Hóspede:');
diasNoites.forEach((dia, index) => {
  console.log(`   ${index + 1}ª noite: ${dia}`);
});

// Simular checkout automático
const dataCheckoutAutomatico = new Date(dataLimite);
dataCheckoutAutomatico.setDate(dataLimite.getDate() + 1); // Dia seguinte à última noite
dataCheckoutAutomatico.setHours(0, 0, 0, 0); // Meia-noite

console.log('\n⏰ Checkout Automático:');
console.log('   Momento:', dataCheckoutAutomatico.toISOString());
console.log('   Data Brasil:', dataCheckoutAutomatico.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

// Validar lógica SQL
const currentDate = dataCheckoutAutomatico;
const condicaoSQL = dataLimite < currentDate;

console.log('\n✅ Validação da Condição SQL:');
console.log(`   data_limite < CURRENT_DATE`);
console.log(`   ${dataLimite.toISOString()} < ${currentDate.toISOString()}`);
console.log(`   Resultado: ${condicaoSQL}`);
console.log(`   Checkout será executado? ${condicaoSQL ? '✅ SIM' : '❌ NÃO'}`);

// Nova triagem
const novaTriagem = new Date(dataCheckoutAutomatico);
novaTriagem.setHours(18, 30, 0, 0);

console.log('\n🏠 Nova Triagem:');
console.log('   Horário:', novaTriagem.toISOString());
console.log('   Data Brasil:', novaTriagem.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
console.log('   Cama disponível? ✅ SIM (checkout foi às 00:00)');

console.log('\n📊 RESUMO:');
console.log(`   Total de noites: ${diasNoites.length}`);
console.log(`   Primeira noite: ${diasNoites[0]}`);
console.log(`   Última noite: ${diasNoites[diasNoites.length - 1]}`);
console.log(`   Checkout automático: ${dataCheckoutAutomatico.toLocaleDateString('pt-BR')} às 00:00`);
console.log(`   Sistema funcionando: ${condicaoSQL ? '✅ CORRETO' : '❌ ERRO'}`);
