#!/bin/bash
# Start Backend - Cobblemon Los Pitufos
# Compila TypeScript y ejecuta el servidor

echo "🔨 Compilando TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Compilación exitosa!"
    echo "🚀 Iniciando servidor..."
    node dist/server.js
else
    echo "❌ Error de compilación. Usando server.js legacy..."
    node server.js
fi
