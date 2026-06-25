#!/usr/bin/env pwsh
param(
  [string]$ProjectDir = "C:\dev\IEDC",
  [string]$Branch = "main",
  [string]$Remote = "origin",
  [string]$HealthUrl = "http://127.0.0.1:8080/api/health/ready"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Fail([string]$Message) {
  Write-Error $Message
  exit 1
}

foreach ($tool in @("git", "docker", "curl.exe")) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    Fail "$tool nao encontrado."
  }
}

if (-not (Test-Path -LiteralPath $ProjectDir)) {
  Fail "$ProjectDir nao existe."
}

$lockDir = Join-Path $ProjectDir ".iedc-update.lock"
if (-not (Test-Path -LiteralPath $lockDir)) {
  New-Item -ItemType Directory -Path $lockDir | Out-Null
} else {
  Fail "atualizacao ja esta em execucao: $lockDir"
}

try {
  Push-Location $ProjectDir

  if (-not (Test-Path -LiteralPath ".git")) {
    Fail "$ProjectDir nao e um repositorio git."
  }

  $status = git status --short
  if ($LASTEXITCODE -ne 0) {
    Fail "nao foi possivel ler o status do git."
  }

  if ($status) {
    Fail "worktree local tem alteracoes. Resolva antes de atualizar."
  }

  Write-Host "Validando compose atual..."
  docker compose config | Out-Null

  Write-Host "Buscando versao aprovada em $Remote/$Branch..."
  git fetch --prune $Remote $Branch
  if ($LASTEXITCODE -ne 0) {
    Fail "falha ao buscar $Remote/$Branch."
  }

  git checkout -B $Branch "$Remote/$Branch"
  if ($LASTEXITCODE -ne 0) {
    Fail "falha ao alinhar branch $Branch."
  }

  git reset --hard "$Remote/$Branch"
  if ($LASTEXITCODE -ne 0) {
    Fail "falha ao sincronizar o worktree com $Remote/$Branch."
  }

  git clean -fd
  if ($LASTEXITCODE -ne 0) {
    Fail "falha ao remover arquivos nao rastreados."
  }

  Write-Host "Validando compose atualizado..."
  docker compose config | Out-Null

  Write-Host "Recriando containers..."
  docker compose up -d --build --force-recreate --remove-orphans
  if ($LASTEXITCODE -ne 0) {
    Fail "falha ao recriar os containers."
  }

  Write-Host "Aguardando saude da API em $HealthUrl..."
  $healthy = $false
  for ($i = 0; $i -lt 40; $i++) {
    & curl.exe -fsS $HealthUrl | Out-Null
    if ($LASTEXITCODE -eq 0) {
      $healthy = $true
      break
    }
    Start-Sleep -Seconds 3
  }

  if (-not $healthy) {
    docker compose ps | Out-String | Write-Error
    docker compose logs --tail=120 backend | Out-String | Write-Error
    Fail "API nao respondeu saudavel depois da atualizacao."
  }

  try {
    docker image prune -f | Out-Null
  } catch {
    Write-Warning "Falha ao limpar imagens antigas; seguindo sem bloquear."
  }

  git rev-parse HEAD | Set-Content -NoNewline "$ProjectDir\.iedc-last-update"
  Write-Host "Atualizacao concluida em $(Get-Date -AsUTC -Format o): $(Get-Content "$ProjectDir\.iedc-last-update")"
}
finally {
  Pop-Location
  Remove-Item -LiteralPath $lockDir -Recurse -Force -ErrorAction SilentlyContinue
}
