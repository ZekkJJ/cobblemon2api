# 🚨 DEPLOY AHORA - 3 Pasos Simples

## ¿Qué Hacer?

Tu código está listo en GitHub, pero el servidor en Pterodactyl necesita actualizarse.

---

## 🎯 OPCIÓN 1: Auto-Update (2 minutos)

Si tienes `AUTO_UPDATE=1` configurado en Pterodactyl:

### Paso 1: Agregar Variable de Entorno
1. Abre Pterodactyl Panel
2. Ve a **Startup** → **Environment Variables**
3. Busca o crea: `FRONTEND_URL`
4. Valor: `https://cobblemon-los-pitufos.vercel.app`
5. **Guarda**

### Paso 2: Reiniciar Servidor
1. **STOP** el servidor
2. Espera 10 segundos
3. **START** el servidor
4. Espera 2-3 minutos (descarga código de GitHub)

### Paso 3: Verificar
```powershell
curl.exe -X OPTIONS -H "Origin: https://cobblemon-los-pitufos.vercel.app" -i https://api.playadoradarp.xyz/port/25617/api/gacha/roll
```

**Busca esta línea:**
```
Access-Control-Allow-Origin: https://cobblemon-los-pitufos.vercel.app
```

✅ Si la ves → **¡FUNCIONÓ!**  
❌ Si ves `*` → Continúa con Opción 2

---

## 🎯 OPCIÓN 2: Manual (5 minutos)

Si AUTO_UPDATE no está activado o no funcionó:

### Paso 1: Agregar Variable de Entorno
(Igual que Opción 1)

### Paso 2: Actualizar Archivo
1. **STOP** el servidor
2. Ve a **File Manager**
3. Navega a: `backend/src/app.ts`
4. Busca la línea ~60-80 que dice algo como:
   ```typescript
   origin: '*'
   ```
   o
   ```typescript
   app.use(cors({
   ```

5. **Reemplaza toda la sección de CORS** con:

```typescript
  // CORS configurado para el frontend
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://cobblemon-los-pitufos.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }));
```

6. **Guarda** el archivo

### Paso 3: Forzar Rebuild
1. En File Manager, busca la carpeta `dist`
2. **Elimínala** completamente
3. Esto fuerza que TypeScript recompile

### Paso 4: Reiniciar
1. **START** el servidor
2. Espera 2-3 minutos
3. Verifica (comando de arriba)

---

## 🎯 OPCIÓN 3: SSH (Avanzado)

Si tienes acceso SSH al servidor:

```bash
# Conectar
ssh usuario@api.playadoradarp.xyz

# Ir al directorio
cd /ruta/al/backend

# Pull cambios
git pull origin main

# Agregar variable
export FRONTEND_URL=https://cobblemon-los-pitufos.vercel.app

# Rebuild
rm -rf dist
npm run build

# Reiniciar (depende de tu setup)
pm2 restart cobblemon-api
# o
systemctl restart cobblemon-api
```

---

## ✅ ¿Cómo Saber que Funcionó?

Después de cualquier opción, ejecuta:

```powershell
curl.exe -X OPTIONS -H "Origin: https://cobblemon-los-pitufos.vercel.app" -i https://api.playadoradarp.xyz/port/25617/api/gacha/roll
```

### ✅ ÉXITO - Deberías ver:
```
Access-Control-Allow-Origin: https://cobblemon-los-pitufos.vercel.app
Access-Control-Allow-Credentials: true
```

### ❌ FALLO - Si ves:
```
Access-Control-Allow-Origin: *
```

Significa que el código viejo sigue corriendo.

---

## 🆘 Si Nada Funciona

1. **Verifica logs del servidor** en Pterodactyl Console
2. **Asegúrate** que `FRONTEND_URL` esté configurado
3. **Confirma** que borraste la carpeta `dist`
4. **Espera** 3-5 minutos después de reiniciar
5. **Revisa** que el servidor esté usando Node.js 18+

---

## 📞 Necesitas Ayuda?

- Revisa los logs en Pterodactyl Console
- Busca errores de compilación TypeScript
- Verifica que todas las env vars estén configuradas
- Asegúrate que MongoDB esté conectado

---

## 🎉 Después de Deployar

Una vez que veas `Access-Control-Allow-Origin: https://cobblemon-los-pitufos.vercel.app`:

1. Abre tu frontend: https://cobblemon-los-pitufos.vercel.app
2. Intenta hacer un gacha roll
3. **¡Debería funcionar sin errores CORS!**

---

**Tiempo estimado:** 2-5 minutos  
**Dificultad:** Fácil  
**Riesgo:** Bajo (solo cambias CORS)

**¡Tú puedes! 💪**
