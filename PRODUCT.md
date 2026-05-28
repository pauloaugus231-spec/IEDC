# Sistema Dias da Cruz - Product Context

register: product

## Product Purpose

Plataforma local de gestao institucional para o Instituto Espirita Dias da Cruz. O sistema conecta operacao diaria, relatorios, indicadores, lojas, financeiro, E.E.I., albergue, impacto social e futuras frentes de captacao de recursos.

## Users

- Gestao institucional: precisa enxergar a instituicao de forma integrada e tomar decisoes com clareza.
- Coordenacoes: precisam operar seu servico sem misturar fluxos de outras areas.
- Educadores e equipe tecnica: precisam registrar informacoes com rapidez, baixa friccao e linguagem proxima da rotina real.
- Secretaria e financeiro: precisam acompanhar comandas, pagamentos, historico e indicadores.
- Equipes das lojas: precisam cadastrar clientes, lancar itens e acompanhar retirada.
- Suporte: precisa criar usuarios, ajustar perfis, redefinir senhas temporarias e manter acessos ativos ou inativos sem expor credenciais. O perfil `suporte` administra tambem perfis de gestao; a gestao usa o sistema para decidir e acompanhar, nao para operar cadastro de usuarios.

## Deployment Model

A V1 oficial e uma implantacao local no servidor do Dias da Cruz, atualizada por repositorio estavel.
O fluxo previsto e: desenvolver no Mac, commitar em branch ou tag estavel privada, atualizar o servidor local com pull controlado, migrations, Docker e verificacao de saude.
Nao tratar esta etapa como migracao para nuvem.

## Brand and Tone

Institucional, humano, sobrio e premium. O visual deve transmitir confianca, cuidado e organizacao, sem parecer corporativo frio nem sistema publico antigo.

## Strategic Principles

- A pessoa usuaria deve sentir que esta em um sistema unico.
- Cada servico deve manter sua autonomia operacional.
- A gestao deve conseguir ver dados juntos ou separados.
- Relatorios, prestacao de contas e evidencias de impacto sao parte central do produto.
- A interface deve ser bonita o suficiente para apresentacao institucional e simples o suficiente para uso em plantao.
- Perfis e permissoes devem ser tratados como governanca institucional, nao como conveniencia visual do frontend.

## Anti-References

- Visual generico de SaaS com gradientes roxos.
- Telas com cards demais e pouca hierarquia.
- Formularios longos sem ritmo visual.
- Estetica de sistema publico antigo.
- Excesso de decoracao que atrapalha operacao.
- Qualquer retorno de frentes removidas do escopo oficial sem nova decisao registrada.
