# 🚨 HAZLO TÚ - Pasos Simples

## El Problema
El servidor en `https://api.playadoradarp.xyz/port/25617` TODAVÍA está devolviendo:
```
Access-Control-Allow-Origin: *
```

Esto significa que **el código nuevo NO está desplegado**.

## La Solución (5 minutos)

### Opción 1: Pterodactyl Panel (MÁS FÁCIL)

1. **Abre tu panel de Pterodactyl**
   - URL: (tu panel de Pterodactyl)

2. **Para el servidor**
   - Botón STOP

3. **Configura la variable de entorno**
   - Ve a: Startup
   - Busca o añade: `FRONTEND_URL`
   - Valor: `https://cobblemon-los-pitufos.vercel.app`
   - Guarda

4. **Actualiza el código**
   
   **Opción A - Si tienes AUTO_UPDATE activado:**
   - Solo reinicia el servidor (paso 6)
   
   **Opción B - Manual:**
   - Ve a File Manager
   - Navega a: `backend/src/app.ts`
   - Busca la línea que dice: `origin: '*'` o similar
   - Reemplázala con el código de abajo

5. **Borra la carpeta `dist`**
   - En File Manager
   - Encuentra la carpeta `dist`
   - Elimínala (fuerza rebuild)

6. **Inicia el servidor**
   - Botón START
   - Espera 2-3 minutos

### Código para app.ts (si haces manual)

Busca la sección de CORS (alrededor de la línea 50-100) y reemplázala con:

```typescript
  // CORS configurado para el frontend
  const allowedOrigins = [
    env.FRONTEND_URL,
    'https://cobblemon-los-pitufos.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin
      if (!origin) return callback(null, true);
      
      // Verificar si el origin está en la lista
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Permitir cualquier dominio .vercel.app
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
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

## Verificar que Funcionó

Después de reiniciar, ejecuta:

```powershell
curl.exe -X OPTIONS -H "Origin: https://cobblemon-los-pitufos.vercel.app" -i https://api.playadoradarp.xyz/port/25617/api/gacha/roll
```

**Deberías ver:**
```
Access-Control-Allow-Origin: https://cobblemon-los-pitufos.vercel.app
```

**NO deberías ver:**
```
Access-Control-Allow-Origin: *
```

## Si Sigue Sin Funcionar

1. Verifica que `FRONTEND_URL` esté configurado
2. Verifica que borraste la carpeta `dist`
3. Verifica que el servidor se reinició completamente
4. Revisa los logs del servidor en Pterodactyl

## Resumen

- ✅ Código: Listo en GitHub
- ❌ Servidor: Necesita actualización
- ⏱️ Tiempo: 5 minutos
- 🎯 Objetivo: Cambiar `*` por `https://cobblemon-los-pitufos.vercel.app`

---

**¡Tú puedes hacerlo!** Solo sigue los pasos. 💪
