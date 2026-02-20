// Script de teste para verificar o checkout automático
const hoje = new Date();
const dataReferencia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
const dataFormatada = dataReferencia.toISOString().split('T')[0];

console.log('=== TESTE DE CHECKOUT AUTOMÁTICO ===');
console.log('Data de hoje:', hoje.toISOString());
console.log('Data de referência:', dataReferencia.toISOString());
console.log('Data formatada (YYYY-MM-DD):', dataFormatada);
console.log('');
console.log('Query SQL que será executada:');
console.log(`
SELECT 
    e.id,
    p.nome,
    e.status,
    e.data_limite,
    e.cama_id,
    c.numero as cama_numero
FROM estadias e
LEFT JOIN pessoas p ON e.pessoa_id = p.id
LEFT JOIN camas c ON e.cama_id = c.id
WHERE e.status = 'ativa'
  AND e.data_limite <= '${dataFormatada}'
ORDER BY e.data_limite;
`);

console.log('\nExplicação:');
console.log('- Busca estadias com status = "ativa"');
console.log(`- Busca data_limite <= '${dataFormatada}'`);
console.log('- Se Adão Sergio tem data_limite = 2026-01-01');
console.log(`- E hoje é ${dataFormatada}`);
console.log(`- Então: 2026-01-01 <= ${dataFormatada}? ${new Date('2026-01-01') <= new Date(dataFormatada) ? 'SIM ✅' : 'NÃO ❌'}`);
