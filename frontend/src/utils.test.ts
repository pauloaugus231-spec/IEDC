import { describe, expect, it } from 'vitest';
import { getNomePrincipal } from './utils';

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
});
