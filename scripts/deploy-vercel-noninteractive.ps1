<#!
.SYNOPSIS
  Non-interactive Vercel deployment script.
.DESCRIPTION
  Deploys the project using Vercel CLI with a provided token and project name.
  Assumes root vercel.json defines builds. Skips prompts via --confirm.
.PARAMETER Token
  Vercel API token (can also be passed via VERCEL_TOKEN env var).
.PARAMETER Project
  Vercel project name.
.PARAMETER Org
  Team/Org slug (scope) if deploying under a team.
.PARAMETER Prod
  Deploy to production when set; otherwise preview.
.PARAMETER Force
  Force a rebuild even if no changes detected.
.EXAMPLE
  pwsh scripts/deploy-vercel-noninteractive.ps1 -Token $env:VERCEL_TOKEN -Project sel-coco-station-report -Prod
#>
param(
  [string]$Token = $env:VERCEL_TOKEN,
  [string]$Project = 'sel-coco-station-report',
  [string]$Org = '',
  [switch]$Prod,
  [switch]$Force
)

function Test-Cli($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required CLI '$name' not found in PATH. Install with: npm i -g vercel"
  }
}
Test-Cli vercel

if (-not $Token) { throw 'Missing Vercel token. Provide -Token or set VERCEL_TOKEN.' }

$env:VERCEL_TOKEN = $Token

Write-Host "[vercel] Deploying project '$Project' (Prod=$Prod Force=$Force)" -ForegroundColor Cyan

$baseArgs = @('deploy','--project',$Project,'--confirm')
if ($Org) { $baseArgs += @('--scope',$Org) }
if ($Prod) { $baseArgs += '--prod' }
if ($Force) { $baseArgs += '--force' }

# Show current git commit ref for traceability
try {
  $commit = git rev-parse --short HEAD 2>$null
  if ($commit) { Write-Host "[vercel] Commit: $commit" }
} catch {}

# Run deployment from repo root
Push-Location (Split-Path $PSCommandPath -Parent | Split-Path -Parent)
try {
  $result = vercel @baseArgs 2>&1
  Write-Host $result

  # Extract deployment URL
  $url = ($result -split "`n" | Select-String -Pattern 'https://.*vercel\.app').Line | Select-Object -First 1
  if ($url) {
    Write-Host "[vercel] Deployment URL: $url" -ForegroundColor Green
  } else {
    Write-Warning '[vercel] Could not detect deployment URL in output.'
  }
} finally {
  Pop-Location
}
