import { Router } from 'express';
import { LevelCapsController } from './level-caps.controller.js';
import { LevelCapsService } from './level-caps.service.js';
import { getUsersCollection, getLevelCapsCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { requireAuth, requireAdmin } from '../auth/auth.middleware.js';
import { ipWhitelistMiddleware } from '../../shared/middleware/ip-whitelist.js';

export async function createLevelCapsRouter(): Promise<Router> {
  const router = Router();
  const usersCollection = await getUsersCollection();
  const levelCapsCollection = await getLevelCapsCollection();
  const levelCapsService = new LevelCapsService(usersCollection, levelCapsCollection);
  const levelCapsController = new LevelCapsController(levelCapsService);

  const readLimiter = createRateLimiter({ windowMs: 60000, max: 100, message: 'Demasiadas solicitudes' });
  const writeLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Demasiadas solicitudes' });

  router.get('/effective', ipWhitelistMiddleware, readLimiter, levelCapsController.getEffectiveCaps);
  router.get('/version', readLimiter, levelCapsController.getVersion);
  router.get('/config', requireAuth, requireAdmin, readLimiter, levelCapsController.getConfig);
  router.put('/config', requireAuth, requireAdmin, writeLimiter, levelCapsController.updateConfig);

  return router;
}
