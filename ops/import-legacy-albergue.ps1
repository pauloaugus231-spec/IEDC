[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath,

  [switch]$Reset
)

$ErrorActionPreference = 'Stop'

if (-not $Reset) {
  throw 'Use -Reset para confirmar a substituicao dos dados atuais do Albergue.'
}

$dump = Get-Item -LiteralPath $DumpPath -ErrorAction Stop
if ($dump.PSIsContainer) {
  throw 'DumpPath precisa apontar para um arquivo SQL.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

try {
  docker compose config --quiet
  if ($LASTEXITCODE -ne 0) { throw 'O arquivo .env ou o Compose nao esta valido.' }

  docker compose up -d --build
  if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel subir o sistema.' }

  $mount = "$($dump.FullName):/legacy.sql:ro"
  docker compose run --rm --no-deps `
    --volume $mount `
    --env LEGACY_DUMP_PATH=/legacy.sql `
    backend node scripts/import-legacy-albergue.mjs --reset
  if ($LASTEXITCODE -ne 0) { throw 'A importacao do legado falhou.' }

  docker compose exec -T postgres-albergue psql -v ON_ERROR_STOP=1 -U iedc_albergue_app -d iedc_albergue -c "SELECT
  (SELECT COUNT(*) FROM pessoas) AS pessoas,
  (SELECT COUNT(*) FROM estadias) AS estadias,
  (SELECT COUNT(*) FROM bloqueios) AS bloqueios,
  (SELECT COUNT(*) FROM ocorrencias) AS ocorrencias,
  (SELECT COUNT(*) FROM solicitacoes) AS solicitacoes;"
  if ($LASTEXITCODE -ne 0) { throw 'A validacao das contagens falhou.' }

  docker compose ps
} finally {
  Pop-Location
}
