export interface PessoaComNomes {
  nome?: string | null;
  nome_social?: string | null;
}

export function getNomePrincipal(
  pessoa?: PessoaComNomes | null,
  fallback = 'Pessoa não encontrada',
): string {
  const nomeSocial = pessoa?.nome_social?.trim();
  if (nomeSocial) return nomeSocial;

  const nomeCivil = pessoa?.nome?.trim();
  return nomeCivil || fallback;
}
