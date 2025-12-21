# PowerShell script to push backend to GitHub using web browser
# This script will guide you through creating a repo and pushing via GitHub Desktop or web

Write-Host "🚀 Cobblemon Backend - Push to GitHub (Web Method)" -ForegroundColor Cyan
Write-Host ""

# Step 1: Open GitHub to create new repo
Write-Host "📝 Step 1: Create GitHub Repository" -ForegroundColor Yellow
Write-Host "   Opening GitHub in your browser..." -ForegroundColor Cyan
Start-Process "https://github.com/new"

Write-Host ""
Write-Host "   Fill in the form:" -ForegroundColor White
Write-Host "   - Repository name: cobblemon-pitufos-backend" -ForegroundColor Green
Write-Host "   - Description: Express.js REST API for Cobblemon Los Pitufos" -ForegroundColor Green
Write-Host "   - Public or Private: Your choice" -ForegroundColor Green
Write-Host "   - DO NOT check any boxes (no README, .gitignore, license)" -ForegroundColor Red
Write-Host "   - Click 'Create repository'" -ForegroundColor Green
Write-Host ""

$created = Read-Host "Press Enter when you've created the repository"

Write-Host ""
Write-Host "📋 Step 2: Get your repository URL" -ForegroundColor Yellow
$repoUrl = Read-Host "Paste your repository URL (e.g., https://github.com/username/cobblemon-pitufos-backend.git)"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "❌ No URL provided. Exiting." -ForegroundColor Red
    exit
}

# Extract username and repo name from URL
if ($repoUrl -match "github\.com[:/]([^/]+)/([^/.]+)") {
    $username = $matches[1]
    $repoName = $matches[2]
    Write-Host "   Username: $username" -ForegroundColor Cyan
    Write-Host "   Repository: $repoName" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🔑 Step 3: Get Personal Access Token" -ForegroundColor Yellow
Write-Host "   Opening GitHub token page..." -ForegroundColor Cyan
Start-Process "https://github.com/settings/tokens/new"

Write-Host ""
Write-Host "   Create a token with these settings:" -ForegroundColor White
Write-Host "   - Note: Cobblemon Backend Push" -ForegroundColor Green
Write-Host "   - Expiration: 90 days (or your preference)" -ForegroundColor Green
Write-Host "   - Select scopes: ✓ repo (full control)" -ForegroundColor Green
Write-Host "   - Click 'Generate token'" -ForegroundColor Green
Write-Host "   - COPY THE TOKEN (you won't see it again!)" -ForegroundColor Red
Write-Host ""

$tokenReady = Read-Host "Press Enter when you have your token copied"

Write-Host ""
Write-Host "🚀 Step 4: Push to GitHub" -ForegroundColor Yellow
Write-Host ""

# Check if remote already exists
$remoteExists = git remote get-url origin 2>$null
if ($remoteExists) {
    Write-Host "   Remote 'origin' already exists. Removing..." -ForegroundColor Yellow
    git remote remove origin
}

Write-Host "   Adding remote..." -ForegroundColor Cyan
git remote add origin $repoUrl

Write-Host "   Renaming branch to main..." -ForegroundColor Cyan
git branch -M main

Write-Host ""
Write-Host "   Pushing to GitHub..." -ForegroundColor Cyan
Write-Host ""
Write-Host "   ⚠️  When prompted for credentials:" -ForegroundColor Yellow
Write-Host "   Username: $username" -ForegroundColor White
Write-Host "   Password: PASTE YOUR TOKEN (not your GitHub password)" -ForegroundColor White
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! Your backend is now on GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   View your repository:" -ForegroundColor Cyan
    $viewUrl = $repoUrl -replace "\.git$", ""
    Write-Host "   $viewUrl" -ForegroundColor Green
    Write-Host ""
    
    $openRepo = Read-Host "Open repository in browser? (y/n)"
    if ($openRepo -eq "y") {
        Start-Process $viewUrl
    }
    
    Write-Host ""
    Write-Host "🎉 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Deploy to Render.com (free): https://render.com" -ForegroundColor White
    Write-Host "   2. Deploy to Railway.app: https://railway.app" -ForegroundColor White
    Write-Host "   3. See DEPLOYMENT.md for instructions" -ForegroundColor White
    
} else {
    Write-Host ""
    Write-Host "❌ Push failed. Troubleshooting:" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Common issues:" -ForegroundColor Yellow
    Write-Host "   1. Wrong token - Make sure you copied it correctly" -ForegroundColor White
    Write-Host "   2. Token doesn't have 'repo' scope" -ForegroundColor White
    Write-Host "   3. Repository URL is wrong" -ForegroundColor White
    Write-Host "   4. Repository doesn't exist yet" -ForegroundColor White
    Write-Host ""
    Write-Host "   Try again:" -ForegroundColor Yellow
    Write-Host "   1. Verify repository exists on GitHub" -ForegroundColor White
    Write-Host "   2. Get a new token with 'repo' scope" -ForegroundColor White
    Write-Host "   3. Run this script again: .\push-web.ps1" -ForegroundColor White
}
