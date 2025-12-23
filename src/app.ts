/**
 * Configuración de la Aplicación Express
 * Cobblemon Los Pitufos - Backend API
 * 
 * Este módulo configura la aplicación Express con todos los
 * middlewares, rutas y manejo de errores necesarios.
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, isDevelopment } from './config/env.js';
import { errorHandler, notFoundHandler } from './shared/middleware/error-handler.js';
import { sanitizeMiddleware } from './shared/middleware/sanitize.js';
import { HealthMonitorService } from './shared/services/health-monitor.service.js';
import { getMongoClient } from './config/database.js';

// Importar funciones de creación de routers
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createPlayersRouter } from './modules/players/players.routes.js';
import { createGachaRouter, createStartersRouter } from './modules/gacha/gacha.routes.js';
import { createVerificationRouter, createVerifyRouter } from './modules/verification/verification.routes.js';
import { createShopRouter } from './modules/shop/shop.routes.js';
import { createTournamentsRouter } from './modules/tournaments/tournaments.routes.js';
import { createLevelCapsRouter } from './modules/level-caps/level-caps.routes.js';
import { createAdminRouter } from './modules/admin/admin.routes.js';
import { createModsRouter } from './modules/mods/mods.routes.js';

/**
 * Crea y configura la aplicación Express
 */
export async function createApp(): Promise<Application> {
  const app = express();

  // Inicializar Health Monitor
  const mongoClient = await getMongoClient();
  const healthMonitor = new HealthMonitorService(mongoClient);

  // Middleware para registrar métricas de requests
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      const isError = res.statusCode >= 400;
      healthMonitor.recordRequest(endpoint, duration, isError);
    });
    next();
  });

  // Hacer healthMonitor disponible en toda la app
  app.set('healthMonitor', healthMonitor);

  // ============================================
  // MIDDLEWARES DE SEGURIDAD
  // ============================================

  // Helmet para headers de seguridad
  app.use(helmet({
    contentSecurityPolicy: isDevelopment ? false : undefined,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configurado para el frontend
  const allowedOrigins = [
    env.FRONTEND_URL,
    'https://cobblemon-los-pitufos.vercel.app',
    'https://cobblemon-los-pitufos-3m5qcj9kq-zekkjjs-projects.vercel.app',
    'http://localhost:3000', // Para desarrollo local
  ].filter(Boolean);

  // Log de orígenes permitidos en desarrollo
  if (isDevelopment) {
    console.log('🌐 CORS - Allowed origins:', allowedOrigins);
  }

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

  // ============================================
  // MIDDLEWARES DE PARSING
  // ============================================

  // Parser de JSON con límite de 1MB para prevenir DoS
  app.use(express.json({ limit: '1mb' }));

  // Parser de URL-encoded con límite de 1MB
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Parser de cookies
  app.use(cookieParser());

  // Sanitizar todos los inputs para prevenir inyección
  app.use(sanitizeMiddleware);

  // ============================================
  // LOGGING EN DESARROLLO
  // ============================================

  if (isDevelopment) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  // Health check endpoint with detailed status
  app.get('/health', async (req, res) => {
    try {
      const healthMonitor = app.get('healthMonitor') as HealthMonitorService;
      const health = await healthMonitor.getHealthStatus();
      
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: 'Health check failed',
      });
    }
  });

  // Metrics endpoint (Prometheus-compatible format)
  app.get('/api/metrics', (req, res) => {
    try {
      const healthMonitor = app.get('healthMonitor') as HealthMonitorService;
      const metrics = healthMonitor.getMetrics();
      
      res.json({
        success: true,
        metrics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics',
      });
    }
  });

  // Server status endpoint (alias for health check)
  app.get('/api/server-status', async (req, res) => {
    try {
      const healthMonitor = app.get('healthMonitor') as HealthMonitorService;
      const health = await healthMonitor.getHealthStatus();
      
      res.json({
        success: true,
        status: health.status === 'healthy' ? 'online' : 'degraded',
        timestamp: new Date().toISOString(),
        message: 'Backend API is running',
        details: health,
      });
    } catch (error) {
      res.json({
        success: true,
        status: 'online',
        timestamp: new Date().toISOString(),
        message: 'Backend API is running',
      });
    }
  });

  // ============================================
  // RUTAS DE LA API
  // ============================================

  // Crear routers de forma asíncrona
  const authRouter = await createAuthRouter();
  const playersRouter = await createPlayersRouter();
  const gachaRouter = await createGachaRouter();
  const startersRouter = await createStartersRouter();
  const verificationRouter = await createVerificationRouter();
  const verifyRouter = await createVerifyRouter();
  const shopRouter = await createShopRouter();
  const tournamentsRouter = await createTournamentsRouter();
  const levelCapsRouter = await createLevelCapsRouter();
  const adminRouter = await createAdminRouter();
  const modsRouter = await createModsRouter();

  // Registrar rutas
  app.use('/api/auth', authRouter);
  app.use('/api/players', playersRouter);
  app.use('/api/gacha', gachaRouter);
  app.use('/api/starters', startersRouter);
  app.use('/api/verification', verificationRouter);
  app.use('/api/verify', verifyRouter);
  app.use('/api/shop', shopRouter);
  app.use('/api/tournaments', tournamentsRouter);
  app.use('/api/level-caps', levelCapsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/mods', modsRouter);

  // Alias para cuando el reverse proxy pasa el path completo
  // Esto soluciona los 404 cuando la request llega como /port/25617/api/...
  const apiRouter = express.Router();
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/players', playersRouter);
  apiRouter.use('/gacha', gachaRouter);
  apiRouter.use('/starters', startersRouter);
  apiRouter.use('/verification', verificationRouter);
  apiRouter.use('/verify', verifyRouter);
  apiRouter.use('/shop', shopRouter);
  apiRouter.use('/tournaments', tournamentsRouter);
  apiRouter.use('/level-caps', levelCapsRouter);
  apiRouter.use('/admin', adminRouter);
  apiRouter.use('/mods', modsRouter);

  app.use('/port/25617/api', apiRouter);

  // ============================================
  // MANEJO DE ERRORES
  // ============================================

  // Ruta no encontrada
  app.use(notFoundHandler);

  // Manejador de errores global
  app.use(errorHandler);

  return app;
}
