import { createPessoa } from './api';

const nomes = [
  'João Silva', 'Maria Oliveira', 'Carlos Souza', 'Ana Paula', 'Bruno Lima',
  'Fernanda Costa', 'Lucas Rocha', 'Patrícia Mendes', 'Ricardo Alves', 'Juliana Martins'
];

const cidades = ['Rio de Janeiro', 'Niterói', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu'];
const ufs = ['RJ', 'SP', 'MG'];
const tipoVagas = ['masculina', 'feminina', 'lgbt', 'idoso'];

export async function gerarPessoasTeste() {
  for (let i = 0; i < 10; i++) {
    const pessoa = {
      nome: nomes[i],
      telefone: `2199${Math.floor(100000 + Math.random() * 899999)}`,
      cidade: cidades[Math.floor(Math.random() * cidades.length)],
      uf: ufs[Math.floor(Math.random() * ufs.length)],
      endereco: `Rua ${i + 1} Teste`,
      data_nascimento: `19${80 + i}-0${(i % 9) + 1}-15`,
      tipo_vaga: tipoVagas[Math.floor(Math.random() * tipoVagas.length)],
    };
    try {
      await createPessoa(pessoa);
      console.log('Pessoa criada:', pessoa.nome);
    } catch (e) {
      console.error('Erro ao criar pessoa:', pessoa.nome, e);
    }
  }
}

// Para rodar manualmente no console do app:
// import { gerarPessoasTeste } from './api.gerarPessoasTeste';
// gerarPessoasTeste();
