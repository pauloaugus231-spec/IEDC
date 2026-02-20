// src/utils.ts
export const getNomePrincipal = (pessoa: any) => {
  if (!pessoa) return 'Pessoa não encontrada';
  return pessoa.nome_social || pessoa.nome || 'Nome não disponível';
};
