# ============================================
# COCO Station Tracker - Vercel Deployment Script
# ============================================

Write-Host "COCO Station Tracker - Vercel Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the frontend directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the frontend directory." -ForegroundColor Yellow
    exit 1
}

# Check if Vercel CLI is installed
Write-Host "Checking Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "Vercel CLI not found!" -ForegroundColor Red
    Write-Host "Installing Vercel CLI globally..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Vercel CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "Vercel CLI installed successfully" -ForegroundColor Green
} else {
    Write-Host "Vercel CLI is installed" -ForegroundColor Green
}

Write-Host ""

# Check if user is logged in to Vercel
Write-Host "Checking Vercel authentication..." -ForegroundColor Yellow
$vercelWhoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in to Vercel" -ForegroundColor Yellow
    Write-Host "Please log in to Vercel:" -ForegroundColor Cyan
    vercel login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Vercel login failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Logged in as: $vercelWhoami" -ForegroundColor Green
}

Write-Host ""

# Check if environment variables template exists
if (Test-Path ".env.vercel.example") {
    Write-Host "Environment Variables Setup Required" -ForegroundColor Yellow
    Write-Host "Before deploying, you need to configure environment variables in Vercel Dashboard." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Required variables (see .env.vercel.example):" -ForegroundColor White
    Write-Host "  - Firebase credentials: GCLOUD_PROJECT, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL" -ForegroundColor Gray
    Write-Host "  - Azure AD credentials: MSAL_TENANT_ID, MSAL_CLIENT_ID" -ForegroundColor Gray
    Write-Host "  - Frontend config: REACT_APP_*" -ForegroundColor Gray
    Write-Host ""
    
    $proceed = Read-Host "Have you configured environment variables in Vercel Dashboard? (yes/no)"
    if ($proceed -ne "yes" -and $proceed -ne "y") {
        Write-Host ""
        Write-Host "Deployment paused." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Deploy once to create the project: vercel" -ForegroundColor White
        Write-Host "2. Go to Vercel Dashboard > Your Project > Settings > Environment Variables" -ForegroundColor White
        Write-Host "3. Add all variables from .env.vercel.example" -ForegroundColor White
        Write-Host "4. Run this script again" -ForegroundColor White
        Write-Host ""
        exit 0
    }
}

Write-Host ""

# Run build test
Write-Host "Testing production build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    Write-Host "Please fix build errors before deploying." -ForegroundColor Yellow
    exit 1
}
Write-Host "Build successful" -ForegroundColor Green

Write-Host ""

# Ask for deployment type
Write-Host "Deployment Options:" -ForegroundColor Cyan
Write-Host "1. Preview deployment (test before production)" -ForegroundColor White
Write-Host "2. Production deployment (live)" -ForegroundColor White
Write-Host ""
$deployType = Read-Host "Select deployment type (1 or 2)"

Write-Host ""

if ($deployType -eq "1") {
    Write-Host "Deploying to preview..." -ForegroundColor Yellow
    vercel
} elseif ($deployType -eq "2") {
    Write-Host "Deploying to production..." -ForegroundColor Yellow
    Write-Host "This will deploy to your live domain!" -ForegroundColor Yellow
    $confirm = Read-Host "Are you sure? (yes/no)"
    if ($confirm -eq "yes" -or $confirm -eq "y") {
        vercel --prod
    } else {
        Write-Host "Production deployment cancelled" -ForegroundColor Red
        exit 0
    }
} else {
    Write-Host "Invalid option. Please select 1 or 2." -ForegroundColor Red
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host ""

# Get deployment URL from Vercel
Write-Host "Post-Deployment Checklist:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Test API health endpoint:" -ForegroundColor White
Write-Host "   curl https://your-app.vercel.app/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure Azure AD redirect URIs:" -ForegroundColor White
Write-Host "   - Go to Azure Portal > Azure AD > App Registrations" -ForegroundColor Gray
Write-Host "   - Add your Vercel URL as redirect URI" -ForegroundColor Gray
Write-Host "   - Add https://*.vercel.app for preview deployments" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configure Firebase authorized domains:" -ForegroundColor White
Write-Host "   - Go to Firebase Console > Authentication > Settings" -ForegroundColor Gray
Write-Host "   - Add your Vercel domain" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test the application:" -ForegroundColor White
Write-Host "   - Visit your Vercel URL" -ForegroundColor Gray
Write-Host "   - Test Microsoft login" -ForegroundColor Gray
Write-Host "   - Submit a test issue" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "   - VERCEL_DEPLOYMENT_GUIDE.md" -ForegroundColor White
Write-Host "   - VERCEL_CHECKLIST.md" -ForegroundColor White
Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
