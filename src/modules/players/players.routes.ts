/**
 * Rutas de Jugadores
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las rutas HTTP para el módulo de jugadores
 */

import { Router } from 'express';
import { PlayersController } from './players.controller.js';
import { PlayersService } from './players.service.js';
import { getUsersCollection, getStartersCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { ipWhitelistMiddleware } from '../../shared/middleware/ip-whitelist.js';

/**
 * Crea el router de jugadores
 */
export async function createPlayersRouter(): Promise<Router> {
  const router = Router();

  // Obtener colecciones
  const usersCollection = await getUsersCollection();
  const startersCollection = await getStartersCollection();

  // Crear servicio y controlador
  const playersService = new PlayersService(usersCollection, startersCollection);
  const playersController = new PlayersController(playersService);

  // Rate limiters
  const readLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 100, // 100 solicitudes por minuto
    message: 'Demasiadas solicitudes de lectura, intenta de nuevo más tarde',
  });

  const syncLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 60, // 60 solicitudes por minuto (1 por segundo)
    message: 'Demasiadas solicitudes de sincronización, intenta de nuevo más tarde',
  });

  // ============================================
  // RUTAS PÚBLICAS (con rate limiting)
  // ============================================

  /**
   * GET /api/players
   * Obtiene lista de todos los jugadores
   */
  router.get('/', readLimiter, playersController.getAllPlayers);

  /**
   * GET /api/players/:uuid
   * Obtiene el perfil completo de un jugador
   */
  router.get('/:uuid', readLimiter, playersController.getPlayerProfile);

  // ============================================
  // RUTAS DEL PLUGIN (requieren IP autorizada)
  // ============================================

  /**
   * POST /api/players/sync
   * Sincroniza datos de un jugador desde el plugin
   */
  router.post('/sync', ipWhitelistMiddleware, syncLimiter, playersController.syncPlayerData);

  /**
   * GET /api/players/starter
   * Verifica si un jugador tiene un starter pendiente
   */
  router.get('/starter', ipWhitelistMiddleware, readLimiter, playersController.checkPendingStarter);

  /**
   * POST /api/players/starter-given
   * Marca el starter como entregado
   */
  router.post('/starter-given', ipWhitelistMiddleware, syncLimiter, playersController.markStarterAsGiven);

  /**
   * GET /api/players/verification-status
   * Obtiene el estado de verificación de un jugador
   */
  router.get('/verification-status', ipWhitelistMiddleware, readLimiter, playersController.getVerificationStatus);

  /**
   * GET /api/players/ban-status
   * Obtiene el estado de ban de un jugador
   */
  router.get('/ban-status', ipWhitelistMiddleware, readLimiter, playersController.getBanStatus);

  // ============================================
  // RUTAS DE ECONOMÍA (requieren IP autorizada)
  // ============================================

  /**
   * GET /api/players/economy/:uuid
   * Obtiene datos de economía de un jugador (synergy, daily, etc.)
   */
  router.get('/economy/:uuid', ipWhitelistMiddleware, readLimiter, playersController.getEconomyData);

  /**
   * POST /api/players/economy/synergy
   * Actualiza el timestamp de última recompensa de sinergia
   */
  router.post('/economy/synergy', ipWhitelistMiddleware, syncLimiter, playersController.updateSynergyReward);

  /**
   * POST /api/players/economy/daily
   * Actualiza el timestamp y streak de recompensa diaria
   */
  router.post('/economy/daily', ipWhitelistMiddleware, syncLimiter, playersController.updateDailyReward);

  /**
   * POST /api/players/economy/species
   * Registra una nueva especie capturada
   */
  router.post('/economy/species', ipWhitelistMiddleware, syncLimiter, playersController.registerCaughtSpecies);

  return router;
}
