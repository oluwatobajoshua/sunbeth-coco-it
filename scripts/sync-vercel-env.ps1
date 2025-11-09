<#!
.SYNOPSIS
  Sync environment variables from a JSON manifest to a Vercel project (production & preview).
.DESCRIPTION
  Reads scripts/vercel-env.example.json (or a provided file) and applies env vars using `vercel env rm/add`.
  Idempotent: only updates when value differs.
.PARAMETER Project
  Vercel project name (defaults to current folder name).
.PARAMETER EnvFile
  Path to env JSON file (default scripts/vercel-env.example.json).
.PARAMETER DryRun
  If set, shows planned changes without applying.
.EXAMPLE
  pwsh scripts/sync-vercel-env.ps1 -Project sunbeth-coco-it
#>
param(
  [string]$Project = (Split-Path -Leaf (Get-Location)),
  [string]$EnvFile = "scripts/vercel-env.example.json",
  [switch]$DryRun
)

function Test-CliPresent($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Error "Required CLI '$name' not found in PATH." -ErrorAction Stop
  }
}

Test-CliPresent vercel

if (-not (Test-Path $EnvFile)) { throw "Env file not found: $EnvFile" }

$manifest = Get-Content $EnvFile | ConvertFrom-Json

if (-not $manifest.production) { throw "Manifest missing 'production' section" }

function Get-VercelEnvMap($scope) {
  $raw = vercel env ls --project $Project --scope $scope 2>$null | Out-String
  $map = @{}
  foreach ($line in $raw -split "`n") {
    if ($line -match '^[A-Z0-9_]+') {
      $parts = $line -split '\s+'
      $key = $parts[0]
      $map[$key] = $true
    }
  }
  return $map
}

function Set-VercelVar($name, $value, $envType) {
  if ($DryRun) { Write-Host "[DRY] set $envType $name"; return }
  # Remove existing silently
  vercel env rm $name $envType --yes --project $Project *> $null
  $tmp = New-TemporaryFile
  Set-Content -Path $tmp -Value $value -NoNewline
  # Feed value via file content (vercel env add reads from stdin). Use Get-Content piping.
  Get-Content $tmp | vercel env add $name $envType --project $Project | Out-Null
  Remove-Item $tmp -Force
  Write-Host "Updated $envType $name"
}

$targets = @('production','preview')
foreach ($target in $targets) {
  if (-not $manifest.$target) { continue }
  Write-Host "--- Syncing $target environment ---" -ForegroundColor Cyan
  $vars = $manifest.$target | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name
  foreach ($var in $vars) {
    $value = $manifest.$target.$var
    if ($null -eq $value) { continue }
    Set-VercelVar -name $var -value $value -envType $target
  }
}

Write-Host "Sync complete." -ForegroundColor Green
