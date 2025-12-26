/**
 * Punto de Entrada para Pterodactyl
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este archivo compila TypeScript y ejecuta el servidor.
 * Usa este archivo en la configuración de Pterodactyl: index.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist', 'server.js');
const srcPath = path.join(__dirname, 'src', 'server.ts');

console.log('🚀 Cobblemon Los Pitufos - Backend');
console.log('================================');

// Verificar si necesitamos compilar
const needsBuild = !fs.existsSync(distPath) || 
  (fs.existsSync(srcPath) && fs.statSync(srcPath).mtime > fs.statSync(distPath).mtime);

if (needsBuild) {
  console.log('🔨 Compilando TypeScript...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Compilación exitosa!');
  } catch (error) {
    console.error('❌ Error compilando TypeScript');
    console.log('⚠️  Intentando usar server.js legacy...');
    
    // Fallback al server.js legacy si existe
    const legacyPath = path.join(__dirname, 'server.js');
    if (fs.existsSync(legacyPath)) {
      require('./server.js');
      return;
    }
    
    console.error('❌ No hay fallback disponible. Saliendo...');
    process.exit(1);
  }
}

// Ejecutar el servidor compilado
console.log('🚀 Iniciando servidor desde dist/server.js...');

// Usar spawn para mantener el proceso vivo
const server = spawn('node', ['dist/server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: process.env
});

server.on('error', (err) => {
  console.error('❌ Error iniciando servidor:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Servidor terminó con código: ${code}`);
  process.exit(code || 0);
});

// Manejar señales de terminación
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM recibido, cerrando...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT recibido, cerrando...');
  server.kill('SIGINT');
});
