# ============================================
# Add Environment Variables to Vercel Project
# ============================================

Write-Host ""
Write-Host "Environment Variables Setup for Vercel" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your Vercel project: sunbeth-energies-coco-it" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found in frontend directory" -ForegroundColor Yellow
    Write-Host "Creating .env from template..." -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Created .env file. Please edit it with your credentials." -ForegroundColor Green
    } else {
        Write-Host "Error: .env.example not found" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Reading environment variables from .env file..." -ForegroundColor Yellow
Write-Host ""

# Read .env file
$envVars = @{}
$requiredVars = @(
    "GCLOUD_PROJECT",
    "FIREBASE_PRIVATE_KEY", 
    "FIREBASE_CLIENT_EMAIL",
    "MSAL_TENANT_ID",
    "MSAL_CLIENT_ID",
    "REACT_APP_FIREBASE_API_KEY",
    "REACT_APP_FIREBASE_AUTH_DOMAIN",
    "REACT_APP_FIREBASE_PROJECT_ID",
    "REACT_APP_FIREBASE_STORAGE_BUCKET",
    "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
    "REACT_APP_FIREBASE_APP_ID",
    "REACT_APP_MSAL_CLIENT_ID",
    "REACT_APP_MSAL_TENANT_ID",
    "REACT_APP_MSAL_REDIRECT_URI",
    "REACT_APP_BACKEND_TYPE",
    "REACT_APP_BACKEND_URL",
    "REACT_APP_USE_MSAL_BRIDGE"
)

Get-Content ".env" | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# Check which required variables are missing
$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "Missing required environment variables:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Please edit the .env file and add these variables." -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "Found all required environment variables!" -ForegroundColor Green
Write-Host ""

# Display what will be added
Write-Host "The following variables will be added to Vercel:" -ForegroundColor Cyan
foreach ($key in $requiredVars) {
    $value = $envVars[$key]
    $displayValue = if ($value.Length -gt 50) { $value.Substring(0, 47) + "..." } else { $value }
    if ($key -match "KEY|SECRET|TOKEN") {
        $displayValue = "***HIDDEN***"
    }
    Write-Host "  $key = $displayValue" -ForegroundColor Gray
}
Write-Host ""

$proceed = Read-Host "Add these variables to Vercel? (yes/no)"
if ($proceed -ne "yes" -and $proceed -ne "y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Adding environment variables to Vercel..." -ForegroundColor Yellow
Write-Host ""

# Add each variable to Vercel
$errorCount = 0
foreach ($key in $requiredVars) {
    $value = $envVars[$key]
    Write-Host "Adding $key..." -ForegroundColor Gray
    
    # Use vercel env add command
    $value | vercel env add $key production preview development
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Failed to add $key" -ForegroundColor Red
        $errorCount++
    } else {
        Write-Host "  Added $key successfully" -ForegroundColor Green
    }
}

Write-Host ""
if ($errorCount -eq 0) {
    Write-Host "All environment variables added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Redeploy your app: vercel --prod" -ForegroundColor White
    Write-Host "2. Configure Azure AD redirect URI: https://sunbeth-energies-coco-it.vercel.app" -ForegroundColor White
    Write-Host "3. Configure Firebase authorized domain: sunbeth-energies-coco-it.vercel.app" -ForegroundColor White
    Write-Host "4. Test your deployment" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Warning: $errorCount variables failed to add" -ForegroundColor Yellow
    Write-Host "You may need to add them manually in Vercel Dashboard" -ForegroundColor Yellow
    Write-Host "https://vercel.com/oluwatobajoshuas-projects/sunbeth-energies-coco-it/settings/environment-variables" -ForegroundColor Cyan
    Write-Host ""
}
