# Implantacao local com Docker

Este modelo foi pensado para o servidor local do IEDC: uma unica maquina na rede interna, com o sistema acessado pelo IP local no Wi-Fi ou cabo.

## Componentes

- `postgres`: banco de dados oficial.
- `redis`: cache leve usado pelo backend.
- `backend`: API NestJS em Node 20.
- `frontend`: React compilado e servido por Nginx.

O navegador acessa apenas o `frontend`. O Nginx encaminha `/api`, `/uploads` e `/socket.io` para o backend.

## Banco e migrations

O banco oficial nasce por migrations versionadas. Em instalacoes novas, o backend executa as migrations no boot e cria o schema inicial completo.

```env
DB_SYNCHRONIZE=false
DB_MIGRATIONS_RUN=true
```

Nao habilite `DB_SYNCHRONIZE=true` em producao. Ele e util apenas para investigacao local controlada, porque permite que o TypeORM altere o schema fora do fluxo versionado.

## Primeira instalacao

No servidor:

```bash
cd /opt/iedc
cp .env.docker.example .env
nano .env
docker compose up -d --build
```

O primeiro boot pode levar um pouco mais porque aplica a migration inicial e cria apenas o usuario inicial de suporte quando o banco esta vazio.

Variaveis obrigatorias antes de subir:

```env
POSTGRES_PASSWORD=senha_forte_do_banco
JWT_SECRET=segredo_longo_unico_para_assinatura_jwt
IEDC_DEFAULT_PASSWORD=senha_temporaria_para_primeiro_acesso
```

Em banco novo, `POSTGRES_PASSWORD` cria a senha inicial do usuario `POSTGRES_USER`.
Em volume ja existente, trocar essa variavel nao altera a senha gravada no PostgreSQL.
Nesse caso, ajuste a senha no banco ou mantenha o mesmo segredo antigo no `.env`.

`IEDC_DEFAULT_PASSWORD` define a senha temporaria do usuario `suporte` criado no primeiro boot. Esse usuario deve trocar a senha no primeiro acesso e criar os demais usuarios reais conforme a necessidade institucional.

Acesse:

```text
http://iedc.local/
```

Se o DNS local ou o arquivo `hosts` ainda nao estiverem prontos, use temporariamente o IP:

```text
http://192.168.0.60/
```

## Atualizacao do sistema

Depois de uma versao aprovada no GitHub:

```bash
cd /opt/iedc
git pull
docker compose up -d --build
docker image prune -f
```

Se a nova versao trouxer migrations, elas rodam automaticamente com `DB_MIGRATIONS_RUN=true`. Antes de atualizar o servidor, valide a versao no Mac ou em um ambiente de teste com banco descartavel.

Para atualizacao controlada, com backup antes do pull e healthcheck depois do deploy:

```bash
sudo PROJECT_DIR=/opt/iedc IEDC_UPDATE_BRANCH=main /opt/iedc/ops/deploy/update-from-repository.sh
```

Documentacao completa:

`ops/deploy/ATUALIZACAO_AUTOMATICA.md`

## Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

## Backup local e Google Drive

O backup oficial deve ser feito por dump do PostgreSQL e copia compactada dos uploads. Nao sincronize a pasta viva do banco.

Exemplo:

```bash
sudo PROJECT_DIR=/opt/iedc /opt/iedc/ops/backup/backup-docker.sh
```

Documentacao completa:

`docs/operacao/backup-restauracao.md`

Para enviar ao Google Drive, configure no servidor um remoto `rclone` com `crypt` e defina no `.env`:

```env
RCLONE_DESTINATION=iedc-drive-crypt:Backups Sistema IEDC
```

## Agendamento diario

Exemplo com cron:

```cron
15 0 * * * PROJECT_DIR=/opt/iedc /opt/iedc/ops/backup/backup-docker.sh >> /var/log/iedc-backup.log 2>&1
```

## Atualizacao automatica

Se voce automatizar a atualizacao, deixe ela para depois do backup:

```cron
0 1 * * * PROJECT_DIR=/opt/iedc IEDC_UPDATE_BRANCH=main /opt/iedc/ops/deploy/update-from-repository.sh >> /var/log/iedc-update.log 2>&1
```

Assim o backup roda as 00:15 e o update roda as 01:00, sem disputar a meia-noite com o cron interno do backend.

## Restauracao rapida

Banco:

```bash
sudo PROJECT_DIR=/opt/iedc /opt/iedc/ops/backup/restore-docker.sh /var/backups/iedc/diario/AAAA-MM-DD_HH-MM-SS --yes
```

Teste restauracao periodicamente. Backup que nunca foi restaurado ainda e uma promessa, nao uma garantia.
