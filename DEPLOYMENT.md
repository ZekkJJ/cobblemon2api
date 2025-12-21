# 🚀 Guía de Deployment - Backend API

El backend es completamente independiente del frontend y puede ser deployado en cualquier plataforma que soporte Node.js.

## 📋 Pre-requisitos

- Node.js 18+
- MongoDB Atlas (o cualquier instancia de MongoDB)
- Variables de entorno configuradas

## 🔧 Variables de Entorno Requeridas

```env
# Base
NODE_ENV=production
PORT=4000

# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=tu-secret-super-seguro-aqui

# Discord OAuth
DISCORD_CLIENT_ID=tu-client-id
DISCORD_CLIENT_SECRET=tu-client-secret
DISCORD_REDIRECT_URI=https://tu-backend.com/api/auth/discord/callback

# Frontend (para CORS)
FRONTEND_URL=https://tu-frontend.com

# Groq AI (opcional)
GROQ_API_KEY=tu-groq-api-key

# Admin IPs (opcional, separados por coma)
ADMIN_IPS=123.456.789.0,98.765.432.1
```

## 🐳 Opción 1: Docker

### Build local
```bash
cd backend
docker build -t cobblemon-api .
docker run -p 4000:4000 --env-file .env cobblemon-api
```

### Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
      - FRONTEND_URL=${FRONTEND_URL}
    restart: unless-stopped
```

## ☁️ Opción 2: Render.com (Recomendado - Free Tier)

1. Conecta tu repo de GitHub
2. Selecciona el directorio `backend`
3. Render detectará automáticamente el `render.yaml`
4. Configura las variables de entorno en el dashboard
5. Deploy automático

**Ventajas:**
- Free tier generoso
- SSL automático
- Auto-deploy desde GitHub
- Health checks incluidos

## 🚂 Opción 3: Railway.app

1. Instala Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Desde el directorio `backend`:
```bash
railway init
railway up
```
4. Configura variables en el dashboard de Railway

**Ventajas:**
- $5 gratis al mes
- Deploy super rápido
- Excelente DX

## 🌊 Opción 4: Vercel (con limitaciones)

```bash
cd backend
vercel --prod
```

**Nota:** Vercel tiene limitaciones para APIs con conexiones persistentes. Mejor usar Render o Railway.

## 🔥 Opción 5: VPS (DigitalOcean, Linode, etc.)

### Con PM2
```bash
# En tu VPS
git clone tu-repo
cd backend
npm install
npm run build

# Instalar PM2
npm install -g pm2

# Crear ecosystem file
pm2 ecosystem

# Editar ecosystem.config.js y luego:
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Con systemd
```bash
# Crear servicio
sudo nano /etc/systemd/system/cobblemon-api.service
```

```ini
[Unit]
Description=Cobblemon API
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/home/nodejs/backend
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable cobblemon-api
sudo systemctl start cobblemon-api
```

## 🧪 Verificar Deployment

Una vez deployado, verifica que funcione:

```bash
# Health check
curl https://tu-api.com/health

# Debería responder:
# {"status":"ok","timestamp":"...","uptime":123}
```

## 🔄 CI/CD con GitHub Actions

Crea `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
        
      - name: Run tests
        working-directory: ./backend
        run: npm test
        
      - name: Build
        working-directory: ./backend
        run: npm run build
        
      # Aquí añade el deploy a tu plataforma elegida
```

## 📊 Monitoreo

El backend incluye:
- Health check endpoint: `/health`
- Logs estructurados con timestamps
- Rate limiting automático
- Error handling centralizado

## 🔒 Seguridad

Antes de deployar en producción:

1. ✅ Cambia `JWT_SECRET` a algo seguro
2. ✅ Configura `ADMIN_IPS` si usas endpoints admin
3. ✅ Revisa CORS en `src/app.ts` para tu dominio
4. ✅ Usa HTTPS (automático en Render/Railway/Vercel)
5. ✅ Mantén las dependencias actualizadas

## 🆘 Troubleshooting

### Error de conexión a MongoDB
- Verifica que `MONGODB_URI` esté correcta
- Asegúrate de whitelist la IP del servidor en MongoDB Atlas

### CORS errors
- Configura `FRONTEND_URL` correctamente
- Verifica que el frontend use la URL correcta del backend

### 502/503 errors
- Verifica que el puerto sea el correcto (4000)
- Revisa los logs del servidor
- Asegúrate que todas las env vars estén configuradas

## 📝 Notas

- El backend usa TypeScript compilado a JavaScript
- Todos los tests deben pasar antes de deployar
- El servidor escucha en el puerto definido en `PORT` (default: 4000)
- MongoDB es requerido para que funcione
