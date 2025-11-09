# ============================================
# Quick Guide: Get Firebase Service Account for Backend
# ============================================

Write-Host ""
Write-Host "Firebase Service Account Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Your Vercel backend needs Firebase Admin SDK credentials." -ForegroundColor White
Write-Host ""

Write-Host "Step 1: Download Service Account JSON" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Yellow
Write-Host "1. Go to: https://console.firebase.google.com" -ForegroundColor White
Write-Host "2. Select project: sunbeth-energies-coco-it-891d2" -ForegroundColor White
Write-Host "3. Click the gear icon > Project Settings" -ForegroundColor White
Write-Host "4. Go to 'Service Accounts' tab" -ForegroundColor White
Write-Host "5. Click 'Generate New Private Key'" -ForegroundColor White
Write-Host "6. Save the JSON file to this folder" -ForegroundColor White
Write-Host ""

$serviceAccountPath = Read-Host "Enter the path to your service account JSON file (or press Enter to skip)"

if ([string]::IsNullOrWhiteSpace($serviceAccountPath)) {
    Write-Host ""
    Write-Host "Skipped. You can add environment variables manually:" -ForegroundColor Yellow
    Write-Host "https://vercel.com/oluwatobajoshuas-projects/sunbeth-energies-coco-it/settings/environment-variables" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Required backend variables:" -ForegroundColor White
    Write-Host "  - GCLOUD_PROJECT" -ForegroundColor Gray
    Write-Host "  - FIREBASE_PRIVATE_KEY" -ForegroundColor Gray
    Write-Host "  - FIREBASE_CLIENT_EMAIL" -ForegroundColor Gray
    Write-Host "  - MSAL_TENANT_ID" -ForegroundColor Gray
    Write-Host "  - MSAL_CLIENT_ID" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

if (-not (Test-Path $serviceAccountPath)) {
    Write-Host "Error: File not found: $serviceAccountPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Reading service account JSON..." -ForegroundColor Yellow

try {
    $json = Get-Content $serviceAccountPath -Raw | ConvertFrom-Json
    
    $projectId = $json.project_id
    $privateKey = $json.private_key
    $clientEmail = $json.client_email
    
    # Format private key for Vercel (replace newlines with \n)
    $formattedKey = $privateKey -replace "`n", "\n"
    
    Write-Host "Successfully read service account!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Project ID: $projectId" -ForegroundColor Gray
    Write-Host "Client Email: $clientEmail" -ForegroundColor Gray
    Write-Host ""
    
    # Get MSAL credentials from existing .env
    Write-Host "Reading MSAL credentials from .env..." -ForegroundColor Yellow
    $msalTenantId = ""
    $msalClientId = ""
    
    if (Test-Path ".env") {
        Get-Content ".env" | ForEach-Object {
            if ($_ -match '^REACT_APP_MSAL_TENANT_ID=(.+)$') {
                $msalTenantId = $matches[1].Trim()
            }
            if ($_ -match '^REACT_APP_MSAL_CLIENT_ID=(.+)$') {
                $msalClientId = $matches[1].Trim()
            }
        }
    }
    
    Write-Host "MSAL Tenant ID: $msalTenantId" -ForegroundColor Gray
    Write-Host "MSAL Client ID: $msalClientId" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "Adding environment variables to Vercel..." -ForegroundColor Yellow
    Write-Host ""
    
    # Add variables to Vercel
    Write-Host "Adding GCLOUD_PROJECT..." -ForegroundColor Gray
    echo $projectId | vercel env add GCLOUD_PROJECT production preview development
    
    Write-Host "Adding FIREBASE_CLIENT_EMAIL..." -ForegroundColor Gray
    echo $clientEmail | vercel env add FIREBASE_CLIENT_EMAIL production preview development
    
    Write-Host "Adding FIREBASE_PRIVATE_KEY..." -ForegroundColor Gray
    echo $formattedKey | vercel env add FIREBASE_PRIVATE_KEY production preview development
    
    Write-Host "Adding MSAL_TENANT_ID..." -ForegroundColor Gray
    echo $msalTenantId | vercel env add MSAL_TENANT_ID production preview development
    
    Write-Host "Adding MSAL_CLIENT_ID..." -ForegroundColor Gray
    echo $msalClientId | vercel env add MSAL_CLIENT_ID production preview development
    
    Write-Host ""
    Write-Host "Environment variables added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Redeploy: vercel --prod" -ForegroundColor White
    Write-Host "2. Update Azure AD redirect URI: https://sunbeth-energies-coco-it.vercel.app" -ForegroundColor White
    Write-Host "3. Update Firebase authorized domain: sunbeth-energies-coco-it.vercel.app" -ForegroundColor White
    Write-Host "4. Update .env: REACT_APP_MSAL_REDIRECT_URI=https://sunbeth-energies-coco-it.vercel.app" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "Error reading service account JSON: $_" -ForegroundColor Red
    exit 1
}
