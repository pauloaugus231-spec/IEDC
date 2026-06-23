# Backup e restauracao - V1 oficial local

## Principio

O backup oficial da V1 e composto por:

- dumps PostgreSQL separados de core, albergue, master e escola em formato customizado;
- arquivo compactado dos uploads;
- manifesto SHA-256 para verificar integridade.

Nao sincronize a pasta viva do banco PostgreSQL. Banco vivo copiado por fora do PostgreSQL e aposta, nao backup.

## Variaveis

No servidor, mantenha o `.env` fora do Git e revise:

```env
POSTGRES_DB=iedc
POSTGRES_USER=iedc_app
POSTGRES_PASSWORD=senha_forte
POSTGRES_ALBERGUE_DB=iedc_albergue
POSTGRES_ALBERGUE_USER=iedc_albergue_app
POSTGRES_MASTER_DB=iedc_master
POSTGRES_MASTER_USER=iedc_master_app
POSTGRES_ESCOLA_DB=iedc_escola
POSTGRES_ESCOLA_USER=iedc_escola_app
BACKUP_ROOT=/var/backups/iedc
BACKUP_STATUS_PATH=/var/backups/iedc/backup-status.json
RESTORE_STATUS_PATH=/var/backups/iedc/restore-status.json
BACKUP_RETENTION_DAYS=30
RCLONE_DESTINATION=
```

`RCLONE_DESTINATION` e opcional. Se estiver vazio, o backup fica apenas local.
`BACKUP_STATUS_PATH` e `RESTORE_STATUS_PATH` alimentam a pagina `Suporte > Saude do sistema`.
Em desenvolvimento local, quando `BACKUP_ROOT` nao estiver definido no `.env`, o `docker-compose.yml`
monta `./.runtime/backups` dentro do backend em `/var/backups/iedc`.

## Gerar backup

```bash
cd /opt/iedc
sudo PROJECT_DIR=/opt/iedc ./ops/backup/backup-docker.sh
```

Saida esperada:

```text
/var/backups/iedc/diario/AAAA-MM-DD_HH-MM-SS
```

Arquivos esperados:

- `iedc-core-AAAA-MM-DD_HH-MM-SS.dump`
- `iedc-albergue-AAAA-MM-DD_HH-MM-SS.dump`
- `iedc-master-AAAA-MM-DD_HH-MM-SS.dump`
- `iedc-escola-AAAA-MM-DD_HH-MM-SS.dump`
- `iedc-uploads-AAAA-MM-DD_HH-MM-SS.tar.gz`
- `manifest.sha256`
- `/var/backups/iedc/backup-status.json`, com status, duracao, tamanho e envio remoto.

## Restaurar backup

Restauracao substitui banco e uploads atuais. Execute apenas com decisao clara.

```bash
cd /opt/iedc
sudo PROJECT_DIR=/opt/iedc ./ops/backup/restore-docker.sh /var/backups/iedc/diario/AAAA-MM-DD_HH-MM-SS --yes
```

O script:

- verifica manifesto, quando existir;
- para frontend e backend;
- restaura os quatro bancos PostgreSQL;
- limpa e restaura uploads;
- sobe backend e frontend novamente.
- grava `/var/backups/iedc/restore-status.json` com o resultado da restauracao.

Backups anteriores ao banco `iedc_escola` continuam aceitos. Quando o dump da Escola
nao existir, o restore limpa o schema escolar e o backend repovoa esse banco a partir
das tabelas legadas restauradas no core.

Depois da restauracao:

```bash
curl http://localhost/api/health
docker compose ps
```

## Agendamento

Exemplo de cron diario as 00:15:

```cron
15 0 * * * PROJECT_DIR=/opt/iedc /opt/iedc/ops/backup/backup-docker.sh >> /var/log/iedc-backup.log 2>&1
```

## Teste periodico

Todo mes, restaure o ultimo backup em ambiente controlado. Backup que nunca foi restaurado ainda e uma narrativa otimista.

## Validacao local

Em 2026-05-28, os scripts foram validados em Docker local:

- backup gerado em `/tmp/iedc-backup-test`;
- manifesto SHA-256 verificado;
- banco PostgreSQL restaurado;
- uploads restaurados via `stdin`, sem depender de bind mount do diretorio de backup;
- backend e frontend subiram novamente;
- `/api/health` retornou OK.
