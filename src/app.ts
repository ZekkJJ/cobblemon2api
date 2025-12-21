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

// Importar funciones de creación de routers
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createPlayersRouter } from './modules/players/players.routes.js';
import { createGachaRouter, createStartersRouter } from './modules/gacha/gacha.routes.js';
import { createVerificationRouter, createVerifyRouter } from './modules/verification/verification.routes.js';
import { createShopRouter } from './modules/shop/shop.routes.js';
import { createTournamentsRouter } from './modules/tournaments/tournaments.routes.js';
import { createLevelCapsRouter } from './modules/level-caps/level-caps.routes.js';
import { createAdminRouter } from './modules/admin/admin.routes.js';

/**
 * Crea y configura la aplicación Express
 */
export async function createApp(): Promise<Application> {
  const app = express();

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
  ].filter(Boolean);

  app.use(cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (como mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Verificar si el origin está en la lista de permitidos
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin); // Devolver el origin específico, no true
      }

      // Permitir cualquier dominio .vercel.app en desarrollo
      if (isDevelopment || origin.endsWith('.vercel.app')) {
        return callback(null, origin); // Devolver el origin específico, no true
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ============================================
  // MIDDLEWARES DE PARSING
  // ============================================

  // Parser de JSON
  app.use(express.json({ limit: '10mb' }));

  // Parser de URL-encoded
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Parser de cookies
  app.use(cookieParser());

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

  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
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

  // ============================================
  // MANEJO DE ERRORES
  // ============================================

  // Ruta no encontrada
  app.use(notFoundHandler);

  // Manejador de errores global
  app.use(errorHandler);

  return app;
}
