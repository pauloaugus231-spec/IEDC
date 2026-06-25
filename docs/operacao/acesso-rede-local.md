# Acesso local na rede

Endereco oficial da instalacao local:

```text
http://iedc.local:8080/
```

IP atual de referencia:

```text
192.168.0.60
```

## Como habilitar o nome local

Opcoes:

1. Registrar `iedc.local` no roteador/DNS local apontando para `192.168.0.60`.
2. Adicionar a linha abaixo no arquivo `hosts` de cada PC da rede:

```txt
192.168.0.60  iedc.local
```

## Acesso com um clique

- Arquivo: `ops/windows/abrir-iedc.url`
- Alternativa: `ops/windows/abrir-iedc.bat`

## Observacao

Se o IP do servidor mudar, atualize a entrada do DNS/hosts para manter o endereco `iedc.local` funcionando.

