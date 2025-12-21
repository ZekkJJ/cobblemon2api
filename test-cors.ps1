# CORS Testing Script (PowerShell)
# Tests CORS configuration for the backend API

$API_URL = "https://api.playadoradarp.xyz/port/25617"
$FRONTEND_ORIGIN = "https://cobblemon-los-pitufos.vercel.app"

Write-Host "🧪 Testing CORS Configuration" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API URL: $API_URL"
Write-Host "Frontend Origin: $FRONTEND_ORIGIN"
Write-Host ""

# Test 1: Health Check
Write-Host "📋 Test 1: Health Check" -ForegroundColor Yellow
Write-Host "-----------------------------------"
try {
    $response = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: OPTIONS Preflight Request
Write-Host "📋 Test 2: OPTIONS Preflight Request" -ForegroundColor Yellow
Write-Host "-----------------------------------"
try {
    $headers = @{
        "Origin" = $FRONTEND_ORIGIN
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    
    $response = Invoke-WebRequest -Uri "$API_URL/api/gacha/roll" -Method Options -Headers $headers -UseBasicParsing
    
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host ""
    Write-Host "CORS Headers:"
    $response.Headers.GetEnumerator() | Where-Object { $_.Key -like "*Access-Control*" } | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)"
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Check Required Headers
Write-Host "📋 Test 3: Checking Required CORS Headers" -ForegroundColor Yellow
Write-Host "-----------------------------------"
try {
    $headers = @{
        "Origin" = $FRONTEND_ORIGIN
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type"
    }
    
    $response = Invoke-WebRequest -Uri "$API_URL/api/gacha/roll" -Method Options -Headers $headers -UseBasicParsing
    
    $corsHeaders = @{
        "Access-Control-Allow-Origin" = $null
        "Access-Control-Allow-Credentials" = $null
        "Access-Control-Allow-Methods" = $null
        "Access-Control-Allow-Headers" = $null
    }
    
    foreach ($key in $corsHeaders.Keys) {
        if ($response.Headers[$key]) {
            Write-Host "✅ $key`: $($response.Headers[$key])" -ForegroundColor Green
        } else {
            Write-Host "❌ $key`: Missing" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    
    # Verify specific values
    if ($response.Headers["Access-Control-Allow-Origin"] -eq $FRONTEND_ORIGIN) {
        Write-Host "✅ Origin matches frontend URL" -ForegroundColor Green
    } else {
        Write-Host "❌ Origin does not match frontend URL" -ForegroundColor Red
        Write-Host "   Expected: $FRONTEND_ORIGIN"
        Write-Host "   Got: $($response.Headers['Access-Control-Allow-Origin'])"
    }
    
    if ($response.Headers["Access-Control-Allow-Credentials"] -eq "true") {
        Write-Host "✅ Credentials enabled" -ForegroundColor Green
    } else {
        Write-Host "❌ Credentials not enabled" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ CORS Test Complete" -ForegroundColor Green
