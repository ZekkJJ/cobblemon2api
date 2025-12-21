# 🚨 URGENT: Deploy CORS Fix to Pterodactyl

## THE PROBLEM
The backend code has been updated with the CORS fix, but **it's not deployed yet** to your Pterodactyl server at `https://api.playadoradarp.xyz/port/25617`.

The server is STILL returning `Access-Control-Allow-Origin: *` (wildcard) which causes the CORS error.

## SOLUTION: Deploy Updated Code to Pterodactyl

### Option 1: Manual Update via Pterodactyl Panel (FASTEST)

1. **Stop the Server**
   - Go to Pterodactyl panel
   - Click STOP button
   - Wait for server to stop completely

2. **Update Code via File Manager**
   - Go to File Manager in Pterodactyl
   - Navigate to `backend/src/app.ts`
   - Replace the CORS configuration section (around line 40-70) with the new code
   
   **Find this section:**
   ```typescript
   app.use(cors({
     origin: (origin, callback) => {
       // ... old code
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
     allowedHeaders: ['Content-Type', 'Authorization'],
   }));
   ```
   
   **Replace with:**
   ```typescript
   app.use(cors({
     origin: (origin, callback) => {
       // Log del origin en desarrollo
       if (isDevelopment && origin) {
         console.log('🔍 CORS - Request from origin:', origin);
       }

       // Permitir requests sin origin (como mobile apps, curl, Postman)
       if (!origin) {
         if (isDevelopment) console.log('✅ CORS - Allowing request without origin');
         return callback(null, true);
       }

       // Verificar si el origin está en la lista de permitidos
       if (allowedOrigins.includes(origin)) {
         if (isDevelopment) console.log('✅ CORS - Origin allowed from list');
         return callback(null, true);
       }

       // Permitir cualquier dominio .vercel.app
       if (origin.endsWith('.vercel.app')) {
         if (isDevelopment) console.log('✅ CORS - Vercel domain allowed');
         return callback(null, true);
       }

       // En desarrollo, permitir localhost con cualquier puerto
       if (isDevelopment && origin.startsWith('http://localhost:')) {
         if (isDevelopment) console.log('✅ CORS - Localhost allowed in development');
         return callback(null, true);
       }

       console.error('❌ CORS - Origin not allowed:', origin);
       callback(new Error('Not allowed by CORS'));
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
     exposedHeaders: ['Set-Cookie'],
     maxAge: 86400, // 24 hours
     preflightContinue: false,
     optionsSuccessStatus: 204,
   }));
   ```

3. **Update Environment Variables**
   - Go to Startup tab in Pterodactyl
   - Find or add these environment variables:
   ```
   FRONTEND_URL=https://cobblemon-los-pitufos.vercel.app
   NODE_ENV=production
   ```

4. **Rebuild and Restart**
   - Delete the `dist` folder (if it exists)
   - Click START button
   - Wait 2-3 minutes for rebuild
   - Check console logs for "✅ Servidor escuchando en puerto 25617"

### Option 2: Git Pull Method (If Auto-Update is Enabled)

1. **Check if Auto-Update is Enabled**
   - Go to Startup tab
   - Look for `AUTO_UPDATE` variable
   - If it's set to `1`, the server will pull from GitHub on restart

2. **Ensure Code is Pushed to GitHub**
   ```powershell
   # In backend directory
   git status
   git add .
   git commit -m "Fix CORS configuration"
   git push origin main
   ```

3. **Restart Server**
   - Stop server in Pterodactyl
   - Start server
   - It will automatically pull latest code from GitHub

4. **Update Environment Variables** (same as Option 1, step 3)

### Option 3: SSH/SFTP Upload (If You Have Access)

1. **Build Locally**
   ```powershell
   cd backend
   npm install
   npm run build
   ```

2. **Upload via SFTP**
   - Connect to your Pterodactyl server via SFTP
   - Upload the entire `backend` folder
   - Or just upload `backend/dist` and `backend/src`

3. **Restart via Panel**
   - Go to Pterodactyl panel
   - Stop and Start the server

## CRITICAL: Environment Variables

Make sure these are set in Pterodactyl:

```env
# REQUIRED
FRONTEND_URL=https://cobblemon-los-pitufos.vercel.app
NODE_ENV=production
PORT=25617

# MongoDB
MONGODB_URI=mongodb+srv://...your-connection-string...
MONGODB_DB=cobblemon

# JWT
JWT_SECRET=your-secure-secret-here

# Discord OAuth
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_REDIRECT_URI=https://api.playadoradarp.xyz/port/25617/api/auth/discord/callback

# Optional
GROQ_API_KEY=your-groq-key
DISCORD_WEBHOOK_URL=your-webhook-url
```

## Verification Steps

After deployment:

1. **Check Server Logs**
   - Look for: "🌐 CORS - Allowed origins: [...]"
   - Should include: `https://cobblemon-los-pitufos.vercel.app`

2. **Test CORS with curl**
   ```powershell
   # Run the test script
   cd backend
   .\test-cors.ps1
   ```
   
   Or manually:
   ```powershell
   curl -X OPTIONS `
     -H "Origin: https://cobblemon-los-pitufos.vercel.app" `
     -H "Access-Control-Request-Method: POST" `
     -H "Access-Control-Request-Headers: Content-Type" `
     -v `
     https://api.playadoradarp.xyz/port/25617/api/gacha/roll
   ```
   
   **Expected response headers:**
   ```
   Access-Control-Allow-Origin: https://cobblemon-los-pitufos.vercel.app
   Access-Control-Allow-Credentials: true
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
   ```

3. **Test from Frontend**
   - Open https://cobblemon-los-pitufos.vercel.app
   - Open browser console
   - Try the gacha roll feature
   - Should work without CORS errors

## Troubleshooting

### Still Getting CORS Errors?

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or open in incognito/private window

2. **Verify Environment Variable**
   ```powershell
   # Check what the server sees
   curl https://api.playadoradarp.xyz/port/25617/health
   ```
   
   Check logs for the FRONTEND_URL value

3. **Check Server Logs**
   - Look for CORS debug messages
   - Should see: "🔍 CORS - Request from origin: https://cobblemon-los-pitufos.vercel.app"
   - Should see: "✅ CORS - Vercel domain allowed"

4. **Verify Code is Updated**
   - Check if `dist/app.js` contains the new CORS code
   - Look for `maxAge: 86400` in the CORS configuration

### Server Won't Start?

1. **Check for Syntax Errors**
   - Review the app.ts file for typos
   - Make sure all brackets match

2. **Check Dependencies**
   - Ensure `cors` package is installed
   - Run `npm install` if needed

3. **Check Port**
   - Ensure PORT=25617 is set
   - No other service using that port

## Quick Reference

**Pterodactyl Panel:** (Your panel URL here)
**Backend URL:** https://api.playadoradarp.xyz/port/25617
**Frontend URL:** https://cobblemon-los-pitufos.vercel.app

**Files to Update:**
- `backend/src/app.ts` (CORS configuration)
- Environment variables in Pterodactyl

**Commands:**
```powershell
# Test CORS
cd backend
.\test-cors.ps1

# Check if code is pushed
git log --oneline -1

# Rebuild locally
npm run build
```

## Success Checklist

- [ ] Backend code updated with new CORS configuration
- [ ] FRONTEND_URL environment variable set to `https://cobblemon-los-pitufos.vercel.app`
- [ ] NODE_ENV set to `production`
- [ ] Server restarted in Pterodactyl
- [ ] CORS test passes (no wildcard in response)
- [ ] Frontend can make requests without CORS errors
- [ ] Browser console shows no errors

---

## Need Help?

If you're stuck:
1. Check Pterodactyl console logs for errors
2. Run `.\test-cors.ps1` to verify CORS headers
3. Ensure FRONTEND_URL is exactly: `https://cobblemon-los-pitufos.vercel.app` (no trailing slash)
4. Try accessing the health endpoint: https://api.playadoradarp.xyz/port/25617/health
