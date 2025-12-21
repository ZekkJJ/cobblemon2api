# PowerShell script to push backend to GitHub
# Run this script from the backend directory

Write-Host "🚀 Cobblemon Backend - Push to GitHub" -ForegroundColor Cyan
Write-Host ""

# Get GitHub username
$username = Read-Host "Enter your GitHub username"

# Get repository name (default: cobblemon-pitufos-backend)
$repoName = Read-Host "Enter repository name (press Enter for 'cobblemon-pitufos-backend')"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "cobblemon-pitufos-backend"
}

# Construct remote URL
$remoteUrl = "https://github.com/$username/$repoName.git"

Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Username: $username"
Write-Host "   Repository: $repoName"
Write-Host "   Remote URL: $remoteUrl"
Write-Host ""

# Ask for confirmation
$confirm = Read-Host "Is this correct? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ Cancelled" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "⚠️  IMPORTANT: Create the repository on GitHub first!" -ForegroundColor Yellow
Write-Host "   Go to: https://github.com/new" -ForegroundColor Yellow
Write-Host "   Repository name: $repoName" -ForegroundColor Yellow
Write-Host "   DO NOT initialize with README, .gitignore, or license" -ForegroundColor Yellow
Write-Host ""

$created = Read-Host "Have you created the repository on GitHub? (y/n)"
if ($created -ne "y") {
    Write-Host "❌ Please create the repository first, then run this script again" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "🔄 Adding remote..." -ForegroundColor Cyan
git remote add origin $remoteUrl

Write-Host "🔄 Renaming branch to main..." -ForegroundColor Cyan
git branch -M main

Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  You will be asked for credentials:" -ForegroundColor Yellow
Write-Host "   Username: $username" -ForegroundColor Yellow
Write-Host "   Password: Use a Personal Access Token (NOT your password)" -ForegroundColor Yellow
Write-Host "   Get token from: https://github.com/settings/tokens" -ForegroundColor Yellow
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "   View at: https://github.com/$username/$repoName" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Push failed. Common issues:" -ForegroundColor Red
    Write-Host "   1. Repository doesn't exist on GitHub" -ForegroundColor Red
    Write-Host "   2. Wrong credentials (use Personal Access Token)" -ForegroundColor Red
    Write-Host "   3. Remote already exists (run: git remote remove origin)" -ForegroundColor Red
}
