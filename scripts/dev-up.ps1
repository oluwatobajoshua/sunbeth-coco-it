param(
	[string] $ServiceAccountPath = "C:\Users\OluwatobaOgunsakin\secrets\firebase\sunbeth-energies-coco-it-891d2-firebase-adminsdk-fbsvc-38f6c878ed.json",
	[string] $ProjectId = "sunbeth-energies-coco-it-891d2"
)

function Set-FirebaseEnv {
	param([string] $Path, [string] $Project)
	if (-not (Test-Path $Path)) {
		Write-Error "Service account file not found: $Path"; exit 1
	}
	[Environment]::SetEnvironmentVariable('GOOGLE_APPLICATION_CREDENTIALS', $Path, 'User')
	[Environment]::SetEnvironmentVariable('FIREBASE_PROJECT_ID', $Project, 'User')
	$env:GOOGLE_APPLICATION_CREDENTIALS = $Path
	$env:FIREBASE_PROJECT_ID = $Project
	Write-Host "GOOGLE_APPLICATION_CREDENTIALS set to $Path (User + Session)"
	Write-Host "FIREBASE_PROJECT_ID set to $Project (User + Session)"
}

function Seed-Live {
	param(
		[string] $BootstrapEmails = ''
	)
	$cmd = "node scripts/seed-live.js --project $ProjectId --creds `"$ServiceAccountPath`""
	if ($BootstrapEmails -and $BootstrapEmails.Trim() -ne '') { $cmd += " --bootstrap `"$BootstrapEmails`"" }
	Write-Host $cmd
	iex $cmd
}

function Promote-User {
	param(
		[Parameter(Mandatory=$true)][string] $Email,
		[string] $Role = 'Super Admin'
	)
	$cmd = "node scripts/promote-user.js --email `"$Email`" --role `"$Role`" --creds `"$ServiceAccountPath`""
	Write-Host $cmd
	iex $cmd
}

function Deploy-Rules {
	# Requires firebase-tools CLI to be logged-in once (firebase login)
	$cmd = "npx firebase-tools deploy --only firestore:rules --project $ProjectId"
	Write-Host $cmd
	iex $cmd
}

# Default behavior when run without dot-sourcing: set env for convenience
if ($MyInvocation.InvocationName -ne '.') {
	Set-FirebaseEnv -Path $ServiceAccountPath -Project $ProjectId
	Write-Host "Ready. Use functions: Seed-Live, Promote-User, Deploy-Rules"
}
