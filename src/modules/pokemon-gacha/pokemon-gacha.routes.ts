/**
 * Pokemon Gacha Routes
 * Cobblemon Los Pitufos - Backend API
 * 
 * Define las rutas HTTP para el sistema gacha
 */

import { Router } from 'express';
import { PokemonGachaController } from './pokemon-gacha.controller.js';
import { PokemonGachaService } from './pokemon-gacha.service.js';
import { BannerService } from './banner.service.js';
import { PityManagerService } from './pity-manager.service.js';
import { PoolBuilderService } from './pool-builder.service.js';
import { getDb, getMongoClient, getUsersCollection } from '../../config/database.js';
import { TransactionManager } from '../../shared/utils/transaction-manager.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { requireAuth, optionalAuth } from '../auth/auth.middleware.js';
import {
  GachaHistoryEntry,
  GachaBanner,
  GachaPity,
  PendingGachaReward,
} from '../../shared/types/pokemon-gacha.types.js';

/**
 * Crea el router de Pokemon Gacha
 */
export async function createPokemonGachaRouter(): Promise<Router> {
  const router = Router();

  // Obtener conexiones
  const db = await getDb();
  const client = await getMongoClient();
  const usersCollection = await getUsersCollection();

  // Obtener/crear colecciones
  const bannersCollection = db.collection<GachaBanner>('gacha_banners');
  const historyCollection = db.collection<GachaHistoryEntry>('gacha_history');
  const pityCollection = db.collection<GachaPity>('gacha_pity');
  const pendingCollection = db.collection<PendingGachaReward>('gacha_pending');
  const idempotencyCollection = db.collection<{ key: string; result: any; createdAt: Date }>('gacha_idempotency');

  // Crear índices
  await createIndexes(bannersCollection, historyCollection, pityCollection, pendingCollection, idempotencyCollection);

  // Crear servicios
  const transactionManager = new TransactionManager(client);
  const pityManager = new PityManagerService(pityCollection);
  const poolBuilder = new PoolBuilderService();
  const bannerService = new BannerService(bannersCollection);

  // Asegurar que existe el banner estándar
  await bannerService.ensureStandardBanner();

  const gachaService = new PokemonGachaService(
    usersCollection,
    historyCollection,
    pendingCollection,
    idempotencyCollection,
    transactionManager,
    pityManager,
    poolBuilder,
    bannerService
  );

  const controller = new PokemonGachaController(gachaService, bannerService);

  // Rate limiters
  const pullLimiter = createRateLimiter({
    windowMs: 60000, // 1 minuto
    max: 30, // 30 tiradas por minuto
    message: 'Demasiadas tiradas, espera un momento',
  });

  const readLimiter = createRateLimiter({
    windowMs: 60000,
    max: 100,
    message: 'Demasiadas solicitudes',
  });

  // ============================================
  // RUTAS PÚBLICAS
  // ============================================

  /**
   * GET /api/pokemon-gacha/banners
   * Obtiene banners activos
   */
  router.get('/banners', readLimiter, controller.getBanners);

  /**
   * GET /api/pokemon-gacha/banners/:id
   * Obtiene un banner específico
   */
  router.get('/banners/:id', readLimiter, controller.getBanner);

  // ============================================
  // RUTAS AUTENTICADAS
  // ============================================

  /**
   * POST /api/pokemon-gacha/pull
   * Ejecuta una tirada simple
   */
  router.post('/pull', pullLimiter, requireAuth, controller.pull);

  /**
   * POST /api/pokemon-gacha/multi-pull
   * Ejecuta 10 tiradas
   */
  router.post('/multi-pull', pullLimiter, requireAuth, controller.multiPull);

  /**
   * GET /api/pokemon-gacha/pity/:bannerId
   * Obtiene estado de pity
   */
  router.get('/pity/:bannerId', readLimiter, requireAuth, controller.getPityStatus);

  /**
   * GET /api/pokemon-gacha/history
   * Obtiene historial de tiradas
   */
  router.get('/history', readLimiter, requireAuth, controller.getHistory);

  /**
   * GET /api/pokemon-gacha/stats
   * Obtiene estadísticas
   */
  router.get('/stats', readLimiter, requireAuth, controller.getStats);

  // ============================================
  // RUTAS PARA PLUGIN
  // ============================================

  /**
   * GET /api/pokemon-gacha/pending/:uuid
   * Obtiene recompensas pendientes
   */
  router.get('/pending/:uuid', readLimiter, controller.getPendingRewards);

  /**
   * POST /api/pokemon-gacha/claim/:rewardId
   * Reclama una recompensa
   */
  router.post('/claim/:rewardId', readLimiter, controller.claimReward);

  /**
   * POST /api/pokemon-gacha/delivery/start
   * Inicia entrega
   */
  router.post('/delivery/start', readLimiter, controller.startDelivery);

  /**
   * POST /api/pokemon-gacha/delivery/failed
   * Marca entrega fallida
   */
  router.post('/delivery/failed', readLimiter, controller.failDelivery);

  // ============================================
  // RUTAS DE ADMIN
  // ============================================

  /**
   * GET /api/pokemon-gacha/admin/banners
   * Obtiene todos los banners (admin)
   */
  router.get('/admin/banners', readLimiter, requireAuth, controller.getAllBanners);

  /**
   * POST /api/pokemon-gacha/admin/banners
   * Crea un banner (admin)
   */
  router.post('/admin/banners', readLimiter, requireAuth, controller.createBanner);

  /**
   * PUT /api/pokemon-gacha/admin/banners/:id
   * Actualiza un banner (admin)
   */
  router.put('/admin/banners/:id', readLimiter, requireAuth, controller.updateBanner);

  /**
   * DELETE /api/pokemon-gacha/admin/banners/:id
   * Desactiva un banner (admin)
   */
  router.delete('/admin/banners/:id', readLimiter, requireAuth, controller.deleteBanner);

  return router;
}

/**
 * Crea índices para las colecciones del gacha
 */
async function createIndexes(
  bannersCollection: any,
  historyCollection: any,
  pityCollection: any,
  pendingCollection: any,
  idempotencyCollection: any
): Promise<void> {
  try {
    // Índices de banners
    await bannersCollection.createIndex({ bannerId: 1 }, { unique: true });
    await bannersCollection.createIndex({ isActive: 1, startDate: 1, endDate: 1 });
    await bannersCollection.createIndex({ type: 1 });

    // Índices de historial
    await historyCollection.createIndex({ playerId: 1, pulledAt: -1 });
    await historyCollection.createIndex({ playerId: 1, bannerId: 1 });
    await historyCollection.createIndex({ playerId: 1, rarity: 1 });

    // Índices de pity
    await pityCollection.createIndex({ playerId: 1, bannerId: 1 }, { unique: true });

    // Índices de pendientes
    await pendingCollection.createIndex({ playerUuid: 1, status: 1 });
    await pendingCollection.createIndex({ rewardId: 1 }, { unique: true });
    await pendingCollection.createIndex({ status: 1, createdAt: 1 });

    // Índices de idempotencia (con TTL de 24 horas)
    await idempotencyCollection.createIndex({ key: 1 }, { unique: true });
    await idempotencyCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

    console.log('[POKEMON GACHA] Índices creados exitosamente');
  } catch (error) {
    console.error('[POKEMON GACHA] Error creando índices:', error);
  }
}
