import { getNomePrincipal } from './pessoa-nome.util';

describe('getNomePrincipal', () => {
  it('prioriza o nome social preenchido', () => {
    expect(getNomePrincipal({ nome: 'Nome Civil', nome_social: 'Nome Social' })).toBe('Nome Social');
  });

  it('usa o nome civil quando o social contém apenas espaços', () => {
    expect(getNomePrincipal({ nome: 'Nome Civil', nome_social: '   ' })).toBe('Nome Civil');
  });

  it('remove espaços externos do nome escolhido', () => {
    expect(getNomePrincipal({ nome: ' Nome Civil ', nome_social: ' Nome Social ' })).toBe('Nome Social');
  });

  it('retorna o fallback quando não há nomes', () => {
    expect(getNomePrincipal(null, 'Sem nome')).toBe('Sem nome');
  });
});
