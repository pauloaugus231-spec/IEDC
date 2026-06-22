import { describe, expect, it } from 'vitest';
import { changedPessoaPayload } from './EditarPessoaModal';

describe('changedPessoaPayload', () => {
  const legacyPerson = {
    id: 'legacy-id',
    nome: 'Pessoa Legada',
    rg: '1',
    nis: 'SEM NIS',
    observacoes: null,
    foto_url: '/uploads/fotos/legacy.jpg',
  };

  it('envia somente os campos alterados', () => {
    expect(changedPessoaPayload(
      { ...legacyPerson, observacoes: 'Cadastro revisado' },
      legacyPerson,
    )).toEqual({ observacoes: 'Cadastro revisado' });
  });

  it('converte campo apagado para null', () => {
    expect(changedPessoaPayload(
      { ...legacyPerson, nome: 'Pessoa Legada', observacoes: '' },
      { ...legacyPerson, observacoes: 'Texto anterior' },
    )).toEqual({ observacoes: null });
  });

  it('nao inclui a foto, que possui endpoint proprio', () => {
    expect(changedPessoaPayload(
      { ...legacyPerson, foto_url: '/uploads/fotos/nova.jpg' },
      legacyPerson,
    )).toEqual({});
  });
});
