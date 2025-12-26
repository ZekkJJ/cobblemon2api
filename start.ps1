# Start Backend - Cobblemon Los Pitufos
# Compila TypeScript y ejecuta el servidor

Write-Host "🔨 Compilando TypeScript..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Compilación exitosa!" -ForegroundColor Green
    Write-Host "🚀 Iniciando servidor..." -ForegroundColor Cyan
    node dist/server.js
} else {
    Write-Host "❌ Error de compilación. Usando server.js legacy..." -ForegroundColor Yellow
    node server.js
}
