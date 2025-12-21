# Quick Deploy Script for CORS Fix
# This script helps you deploy the CORS fix to your Pterodactyl server

Write-Host "🚨 CORS Fix Deployment Helper" -ForegroundColor Red
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you deploy the CORS fix to:" -ForegroundColor Yellow
Write-Host "  https://api.playadoradarp.xyz/port/25617" -ForegroundColor White
Write-Host ""

Write-Host "📋 What needs to be done:" -ForegroundColor Cyan
Write-Host "  1. Update backend code on Pterodactyl server" -ForegroundColor White
Write-Host "  2. Set FRONTEND_URL environment variable" -ForegroundColor White
Write-Host "  3. Restart the server" -ForegroundColor White
Write-Host ""

Write-Host "❓ How do you want to deploy?" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [1] I have Pterodactyl panel access (Manual update)" -ForegroundColor Green
Write-Host "  [2] I have SSH/SFTP access" -ForegroundColor Green
Write-Host "  [3] Auto-update is enabled (Git pull)" -ForegroundColor Green
Write-Host "  [4] Show me the code to copy-paste" -ForegroundColor Green
Write-Host "  [5] Just test if CORS is working" -ForegroundColor Cyan
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📝 Manual Update via Pterodactyl Panel" -ForegroundColor Cyan
        Write-Host "======================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Follow these steps:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Open your Pterodactyl panel" -ForegroundColor White
        Write-Host "2. STOP the server" -ForegroundColor White
        Write-Host "3. Go to File Manager" -ForegroundColor White
        Write-Host "4. Navigate to: backend/src/app.ts" -ForegroundColor White
        Write-Host "5. Edit the file and update the CORS section" -ForegroundColor White
        Write-Host "6. Go to Startup tab" -ForegroundColor White
        Write-Host "7. Set environment variable:" -ForegroundColor White
        Write-Host "   FRONTEND_URL=https://cobblemon-los-pitufos.vercel.app" -ForegroundColor Green
        Write-Host "8. Delete the 'dist' folder (if exists)" -ForegroundColor White
        Write-Host "9. START the server" -ForegroundColor White
        Write-Host ""
        Write-Host "📄 See URGENT_CORS_FIX_DEPLOYMENT.md for detailed instructions" -ForegroundColor Cyan
        Write-Host ""
        
        $openFile = Read-Host "Open deployment guide? (y/n)"
        if ($openFile -eq "y") {
            Start-Process "URGENT_CORS_FIX_DEPLOYMENT.md"
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔧 SSH/SFTP Deployment" -ForegroundColor Cyan
        Write-Host "======================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "First, let's build the code locally..." -ForegroundColor Yellow
        Write-Host ""
        
        $build = Read-Host "Build now? (y/n)"
        if ($build -eq "y") {
            Write-Host "Building..." -ForegroundColor Cyan
            npm run build
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Build successful!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Now upload these folders to your server:" -ForegroundColor Yellow
                Write-Host "  - backend/dist/" -ForegroundColor White
                Write-Host "  - backend/src/" -ForegroundColor White
                Write-Host "  - backend/package.json" -ForegroundColor White
                Write-Host ""
                Write-Host "Then restart the server in Pterodactyl panel" -ForegroundColor Yellow
            } else {
                Write-Host "❌ Build failed. Check for errors above." -ForegroundColor Red
            }
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔄 Git Auto-Update Deployment" -ForegroundColor Cyan
        Write-Host "=============================" -ForegroundColor Cyan
        Write-Host ""
        
        # Check if code is committed
        $status = git status --porcelain
        if ($status) {
            Write-Host "⚠️  You have uncommitted changes!" -ForegroundColor Yellow
            Write-Host ""
            git status --short
            Write-Host ""
            
            $commit = Read-Host "Commit and push now? (y/n)"
            if ($commit -eq "y") {
                git add .
                git commit -m "Deploy CORS fix to production"
                git push origin main
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Pushed to GitHub!" -ForegroundColor Green
                } else {
                    Write-Host "❌ Push failed" -ForegroundColor Red
                    exit
                }
            }
        } else {
            Write-Host "✅ Code is already committed" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "Now in Pterodactyl:" -ForegroundColor Yellow
        Write-Host "  1. Go to Startup tab" -ForegroundColor White
        Write-Host "  2. Verify AUTO_UPDATE = 1" -ForegroundColor White
        Write-Host "  3. Set FRONTEND_URL=https://cobblemon-los-pitufos.vercel.app" -ForegroundColor White
        Write-Host "  4. STOP the server" -ForegroundColor White
        Write-Host "  5. START the server (it will pull from GitHub)" -ForegroundColor White
        Write-Host ""
    }
    
    "4" {
        Write-Host ""
        Write-Host "📋 Code to Copy-Paste" -ForegroundColor Cyan
        Write-Host "=====================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Opening the updated app.ts file..." -ForegroundColor Yellow
        Start-Process "src/app.ts"
        Write-Host ""
        Write-Host "Copy the CORS configuration section (around line 40-90)" -ForegroundColor Yellow
        Write-Host "Paste it into your Pterodactyl File Manager" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Environment variable to set:" -ForegroundColor Yellow
        Write-Host "FRONTEND_URL=https://cobblemon-los-pitufos.vercel.app" -ForegroundColor Green
        Write-Host ""
    }
    
    "5" {
        Write-Host ""
        Write-Host "🧪 Testing CORS Configuration" -ForegroundColor Cyan
        Write-Host "=============================" -ForegroundColor Cyan
        Write-Host ""
        
        if (Test-Path "test-cors.ps1") {
            Write-Host "Running CORS test..." -ForegroundColor Yellow
            Write-Host ""
            & ".\test-cors.ps1"
        } else {
            Write-Host "❌ test-cors.ps1 not found" -ForegroundColor Red
            Write-Host ""
            Write-Host "Testing manually..." -ForegroundColor Yellow
            
            try {
                $headers = @{
                    "Origin" = "https://cobblemon-los-pitufos.vercel.app"
                    "Access-Control-Request-Method" = "POST"
                    "Access-Control-Request-Headers" = "Content-Type"
                }
                
                $response = Invoke-WebRequest -Uri "https://api.playadoradarp.xyz/port/25617/api/gacha/roll" -Method Options -Headers $headers -UseBasicParsing
                
                Write-Host "✅ Server is responding!" -ForegroundColor Green
                Write-Host ""
                Write-Host "CORS Headers:" -ForegroundColor Cyan
                $response.Headers.GetEnumerator() | Where-Object { $_.Key -like "*Access-Control*" } | ForEach-Object {
                    Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor White
                }
                
                Write-Host ""
                $allowOrigin = $response.Headers["Access-Control-Allow-Origin"]
                if ($allowOrigin -eq "*") {
                    Write-Host "❌ PROBLEM: Server is returning wildcard (*)" -ForegroundColor Red
                    Write-Host "   The CORS fix has NOT been deployed yet!" -ForegroundColor Red
                } elseif ($allowOrigin -eq "https://cobblemon-los-pitufos.vercel.app") {
                    Write-Host "✅ SUCCESS: CORS is configured correctly!" -ForegroundColor Green
                } else {
                    Write-Host "⚠️  WARNING: Unexpected origin: $allowOrigin" -ForegroundColor Yellow
                }
                
            } catch {
                Write-Host "❌ Error testing CORS: $_" -ForegroundColor Red
            }
        }
    }
    
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "📚 For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "   URGENT_CORS_FIX_DEPLOYMENT.md" -ForegroundColor White
Write-Host ""
