# Deploy Plugin 404 Fix to Backend
# This script commits and pushes the fix for missing /api/admin/ban-status endpoint

Write-Host "🚀 Deploying Plugin 404 Fix..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from backend directory" -ForegroundColor Red
    exit 1
}

# Show what changed
Write-Host "📝 Changes to deploy:" -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "📦 Adding changes..." -ForegroundColor Cyan
git add src/modules/admin/

Write-Host ""
Write-Host "💾 Committing..." -ForegroundColor Cyan
git commit -m "fix: add missing /api/admin/ban-status endpoint for Minecraft plugin

- Added getBanStatus method to AdminController
- Added getBanStatus method to AdminService
- Added GET /api/admin/ban-status route
- Fixes 404 errors from Minecraft plugin on player join
- Returns { banned: boolean, banReason?: string }
"

Write-Host ""
Write-Host "🚢 Pushing to GitHub..." -ForegroundColor Cyan
git push

Write-Host ""
Write-Host "✅ Deploy complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Wait for Render to auto-deploy (2-3 minutes)"
Write-Host "  2. Check Render dashboard: https://dashboard.render.com"
Write-Host "  3. Restart Minecraft server to reconnect plugin"
Write-Host "  4. Monitor logs for 404 errors (should be gone)"
Write-Host ""
