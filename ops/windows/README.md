# Acesso local no Windows

Use este conjunto para abrir o sistema sem decorar IP.

## Endereco oficial

- `http://iedc.local/`

## Mapeamento de host

Adicione a linha abaixo no arquivo `C:\Windows\System32\drivers\etc\hosts` de cada computador que vai acessar o sistema:

```txt
192.168.0.60  iedc.local
```

Se preferir, a mesma regra pode ser aplicada no roteador por DNS local ou reserva DHCP.

## Atalho de abertura

- Use o arquivo `abrir-iedc.url` para abrir o sistema com um clique.
- Se quiser, copie esse atalho para a area de trabalho ou fixe na barra de tarefas.

