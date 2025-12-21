/**
 * Rutas de Gacha
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las rutas HTTP para el módulo de gacha
 */

import { Router } from 'express';
import { GachaController } from './gacha.controller.js';
import { GachaService } from './gacha.service.js';
import { SoulDrivenService } from './soul-driven.service.js';
import { getUsersCollection, getStartersCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { requireAuth } from '../auth/auth.middleware.js';

/**
 * Crea el router de gacha
 */
export async function createGachaRouter(): Promise<Router> {
  const router = Router();

  // Obtener colecciones
  const usersCollection = await getUsersCollection();
  const startersCollection = await getStartersCollection();

  // Crear servicios y controlador
  const gachaService = new GachaService(usersCollection, startersCollection);
  const soulDrivenService = new SoulDrivenService(usersCollection, startersCollection);
  const gachaController = new GachaController(gachaService, soulDrivenService);

  // Rate limiters
  const readLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 100, // 100 solicitudes por minuto
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
  });

  const rollLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 20, // 20 solicitudes por minuto
    message: 'Demasiadas solicitudes de tirada, intenta de nuevo más tarde',
  });

  // ============================================
  // RUTAS DE GACHA
  // ============================================

  /**
   * GET /api/gacha/roll
   * Verifica el estado de tirada de un usuario
   */
  router.get('/roll', readLimiter, gachaController.checkRollStatus);

  /**
   * POST /api/gacha/roll
   * Realiza una tirada clásica (aleatoria)
   */
  router.post('/roll', rollLimiter, gachaController.performClassicRoll);

  /**
   * POST /api/gacha/soul-driven
   * Realiza una tirada Soul Driven basada en personalidad
   */
  router.post('/soul-driven', rollLimiter, gachaController.performSoulDrivenRoll);

  return router;
}

/**
 * Crea el router de starters (separado para mantener compatibilidad)
 */
export async function createStartersRouter(): Promise<Router> {
  const router = Router();

  // Obtener colecciones
  const usersCollection = await getUsersCollection();
  const startersCollection = await getStartersCollection();

  // Crear servicio y controlador
  const gachaService = new GachaService(usersCollection, startersCollection);
  const soulDrivenService = new SoulDrivenService(usersCollection, startersCollection);
  const gachaController = new GachaController(gachaService, soulDrivenService);

  // Rate limiter
  const readLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 100, // 100 solicitudes por minuto
    message: 'Demasiadas solicitudes, intenta de nuevo más tarde',
  });

  /**
   * GET /api/starters
   * Obtiene todos los starters con su estado de reclamo
   */
  router.get('/', readLimiter, gachaController.getAllStarters);

  return router;
}
