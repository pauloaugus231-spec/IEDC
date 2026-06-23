# iedc_master

O `iedc_master` e o banco de pessoas que se relacionam institucionalmente com o
IEDC. Ele nao armazena pessoas atendidas pelo Albergue nem criancas da Creche.

## Fronteiras

- `identidade`: cadastro mestre, CPF, nomes e contatos.
- `comercial`: lojas, produtos, comandas, pagamentos, caixas e retiradas.
- `membros`: reservado para dados privativos de membros.
- `voluntariado`: reservado para dados privativos de voluntariado.

Os schemas `membros` e `voluntariado` existem desde a primeira migration, mas
nao possuem tabelas inventadas antes de suas regras de negocio serem definidas.

## Identidade e historico

Uma comanda referencia `identidade.pessoas.id` pela coluna `pessoa_id`. A coluna
`nome_pessoa_snapshot` conserva o nome exibido no momento da compra. Isso permite
atualizar o cadastro da pessoa sem alterar documentos e relatorios historicos.

O schema comercial acessa pessoas pela view `comercial.clientes`, que expoe
somente os campos necessarios ao atendimento das lojas e inclui as observacoes
privativas do relacionamento comercial.

## Produtos por loja

Os produtos ficam em `comercial.produtos` e pertencem obrigatoriamente a uma
loja por `loja_id`. O isolamento entre Bazar, Brecho e Feirao e aplicado nas
rotas e consultas do backend. Como cada loja possui poucos produtos, um schema
por loja aumentaria a manutencao sem melhorar o desempenho.

## Permissoes

O acesso externo `PUBLIC` aos quatro schemas e revogado pela migration. Nesta
etapa o backend NestJS e um monolito modular e usa um usuario proprietario do
master; portanto, a separacao entre departamentos tambem depende dos guards de
perfil e dos servicos do backend. Quando um departamento virar servico separado,
ele deve receber um usuario PostgreSQL proprio com permissao apenas nos schemas
necessarios.

## Migracao do legado

No primeiro boot, o backend detecta as tabelas `comercio_*` do core e copia os
dados para o master dentro de uma unica transacao. A conclusao fica registrada
em `comercial.migracoes_legado`, tornando a operacao repetivel e segura. As
tabelas antigas permanecem intactas como contingencia e poderao ser removidas
somente depois de um periodo de validacao e backup confirmado.
