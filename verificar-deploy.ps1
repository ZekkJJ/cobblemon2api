# Script para verificar que el deploy de CORS funcionó
# Ejecuta esto después de deployar

Write-Host ""
Write-Host "🔍 Verificando CORS en producción..." -ForegroundColor Cyan
Write-Host ""

$url = "https://api.playadoradarp.xyz/port/25617/api/gacha/roll"
$origin = "https://cobblemon-los-pitufos.vercel.app"

Write-Host "📡 Haciendo request OPTIONS a:" -ForegroundColor Yellow
Write-Host "   $url" -ForegroundColor White
Write-Host "   Origin: $origin" -ForegroundColor White
Write-Host ""

# Hacer el request
$response = curl.exe -X OPTIONS -H "Origin: $origin" -i $url 2>&1

# Buscar el header importante
$corsHeader = $response | Select-String "Access-Control-Allow-Origin:"
$credsHeader = $response | Select-String "Access-Control-Allow-Credentials:"

Write-Host "📋 Resultados:" -ForegroundColor Cyan
Write-Host ""

if ($corsHeader) {
    $headerValue = $corsHeader.ToString().Trim()
    Write-Host "   $headerValue" -ForegroundColor White
    
    if ($headerValue -match "\*") {
        Write-Host ""
        Write-Host "❌ FALLO: Todavía usa wildcard (*)" -ForegroundColor Red
        Write-Host ""
        Write-Host "   El código nuevo NO está desplegado." -ForegroundColor Yellow
        Write-Host "   Sigue los pasos en DEPLOY_AHORA.md" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    elseif ($headerValue -match $origin) {
        Write-Host ""
        Write-Host "✅ ÉXITO: Origin específico configurado!" -ForegroundColor Green
        
        if ($credsHeader) {
            Write-Host "   $($credsHeader.ToString().Trim())" -ForegroundColor White
            Write-Host ""
            Write-Host "🎉 ¡CORS está correctamente configurado!" -ForegroundColor Green
            Write-Host ""
            Write-Host "   Ahora puedes:" -ForegroundColor Cyan
            Write-Host "   1. Abrir: https://cobblemon-los-pitufos.vercel.app" -ForegroundColor White
            Write-Host "   2. Intentar un gacha roll" -ForegroundColor White
            Write-Host "   3. ¡Debería funcionar sin errores!" -ForegroundColor White
            Write-Host ""
            exit 0
        }
    }
}
else {
    Write-Host "❌ ERROR: No se pudo obtener respuesta del servidor" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Posibles causas:" -ForegroundColor Yellow
    Write-Host "   - El servidor está caído" -ForegroundColor White
    Write-Host "   - Problemas de red" -ForegroundColor White
    Write-Host "   - URL incorrecta" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
