# Backup e restauracao - V1 oficial local

## Principio

O backup oficial da V1 e composto por:

- dump PostgreSQL em formato customizado;
- arquivo compactado dos uploads;
- manifesto SHA-256 para verificar integridade.

Nao sincronize a pasta viva do banco PostgreSQL. Banco vivo copiado por fora do PostgreSQL e aposta, nao backup.

## Variaveis

No servidor, mantenha o `.env` fora do Git e revise:

```env
POSTGRES_DB=iedc
POSTGRES_USER=iedc_app
POSTGRES_PASSWORD=senha_forte
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

- `iedc-db-AAAA-MM-DD_HH-MM-SS.dump`
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
- restaura o PostgreSQL;
- limpa e restaura uploads;
- sobe backend e frontend novamente.
- grava `/var/backups/iedc/restore-status.json` com o resultado da restauracao.

Depois da restauracao:

```bash
curl http://localhost/api/health
docker compose ps
```

## Agendamento

Exemplo de cron diario as 02:30:

```cron
30 2 * * * PROJECT_DIR=/opt/iedc /opt/iedc/ops/backup/backup-docker.sh >> /var/log/iedc-backup.log 2>&1
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
