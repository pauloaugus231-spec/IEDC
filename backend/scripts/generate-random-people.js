const axios = require('axios');

const nomes = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Pereira', 'Fernanda Lima', 'Lucas Rodrigues', 'Juliana Almeida', 'Rafael Ferreira', 'Camila Gomes', 'Gabriel Carvalho', 'Isabela Martins', 'Felipe Souza', 'Larissa Rocha', 'Thiago Ribeiro', 'Beatriz Dias', 'Bruno Barbosa', 'Carolina Castro', 'Diego Fernandes', 'Eduarda Moreira', 'Enzo Cardoso', 'Fabiana Pinto', 'Gustavo Teixeira', 'Helena Nunes', 'Igor Correia', 'Júlia Mendes', 'Leonardo Barros', 'Mariana Freitas', 'Nicolas Vieira', 'Olivia Santos', 'Paulo Lima', 'Quintino Rocha', 'Renata Alves', 'Samuel Pereira', 'Tatiana Costa', 'Ubirajara Silva', 'Valentina Oliveira', 'Wagner Martins', 'Xuxa Gomes', 'Yuri Carvalho', 'Zara Fernandes', 'Adriana Barbosa', 'Bernardo Castro', 'Cecília Moreira', 'Daniel Cardoso', 'Elisa Pinto', 'Fábio Teixeira', 'Gabriela Nunes', 'Henrique Correia', 'Inês Mendes'];

const nomesSociais = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jamie', 'Pat', 'Robin', 'Skyler', 'Avery', 'Blair', 'Cameron', 'Dakota', 'Ellis', 'Finley', 'Harper', 'Indigo', 'Jaden', 'Kendall', 'Logan', 'Madison', 'Nico', 'Oakley', 'Parker', 'Quinn', 'Reese', 'Sage', 'Tanner', 'Umber', 'Vesper', 'Willow', 'Xander', 'Yara', 'Zephyr'];

const sexos = ['Masculino', 'Feminino'];
const generos = ['Homem cisgênero', 'Mulher cisgênero', 'Homem transgênero', 'Mulher transgênero', 'Travesti', 'Não binário'];
const cores = ['Branco', 'Preto', 'Pardo', 'Amarelo', 'Indígena'];
const racas = ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena'];
const sexualidades = ['Heterossexual', 'Homossexual', 'Bissexual', 'Assexual', 'Pansexual'];
const cidades = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Brasília', 'Curitiba', 'Porto Alegre', 'Recife', 'Fortaleza', 'Manaus'];
const ufs = ['SP', 'RJ', 'MG', 'BA', 'DF', 'PR', 'RS', 'PE', 'CE', 'AM'];
const tipoVagas = ['masculina', 'feminina', 'lgbt', 'idoso'];

function gerarCPF() {
  const cpf = Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
  return cpf.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3-') + Math.floor(Math.random() * 10);
}

function gerarTelefone() {
  return `(${Math.floor(Math.random() * 90) + 10}) ${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function gerarDataNascimento() {
  const ano = Math.floor(Math.random() * 60) + 1960;
  const mes = Math.floor(Math.random() * 12) + 1;
  const dia = Math.floor(Math.random() * 28) + 1;
  return `${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
}

function gerarNIS() {
  return Array.from({length: 11}, () => Math.floor(Math.random() * 10)).join('');
}

async function criarPessoa() {
  const nome = nomes[Math.floor(Math.random() * nomes.length)];
  const nome_social = Math.random() > 0.7 ? nomesSociais[Math.floor(Math.random() * nomesSociais.length)] : null;
  const cpf = gerarCPF();
  const rg = Math.floor(Math.random() * 10000000000).toString();
  const nis = gerarNIS();
  const data_nascimento = gerarDataNascimento();
  const naturalidade = cidades[Math.floor(Math.random() * cidades.length)];
  const telefone = gerarTelefone();
  const sexo = sexos[Math.floor(Math.random() * sexos.length)];
  const genero = generos[Math.floor(Math.random() * generos.length)];
  const cor = cores[Math.floor(Math.random() * cores.length)];
  const raca = racas[Math.floor(Math.random() * racas.length)];
  const sexualidade = sexualidades[Math.floor(Math.random() * sexualidades.length)];
  const tipo_vaga = tipoVagas[Math.floor(Math.random() * tipoVagas.length)];
  const endereco = `Rua ${Math.floor(Math.random() * 1000) + 1}, ${cidades[Math.floor(Math.random() * cidades.length)]}`;
  const cidade = cidades[Math.floor(Math.random() * cidades.length)];
  const uf = ufs[Math.floor(Math.random() * ufs.length)];
  const alergias = Math.random() > 0.8 ? 'Nenhuma' : null;
  const condicoes_cronicas = Math.random() > 0.9 ? 'Nenhuma' : null;
  const medicamentos_uso_continuo = Math.random() > 0.9 ? 'Nenhum' : null;
  const observacoes = Math.random() > 0.8 ? 'Observação aleatória' : null;

  const pessoa = {
    nome,
    nome_social,
    cpf,
    rg,
    nis,
    data_nascimento,
    naturalidade,
    telefone,
    sexo,
    genero,
    cor,
    raca,
    sexualidade,
    endereco,
    cidade,
    uf,
    tipo_vaga,
    alergias,
    condicoes_cronicas,
    medicamentos_uso_continuo,
    observacoes
  };

  try {
    const response = await axios.post('http://localhost:3001/api/pessoas', pessoa);
    console.log(`Pessoa criada: ${response.data.nome}`);
  } catch (error) {
    console.error(`Erro ao criar pessoa: ${error.response?.data?.message || error.message}`);
  }
}

async function main() {
  for (let i = 0; i < 50; i++) {
    await criarPessoa();
    await new Promise(resolve => setTimeout(resolve, 100)); // Pequena pausa para evitar sobrecarga
  }
  console.log('50 cadastros criados com sucesso!');
}

main();
