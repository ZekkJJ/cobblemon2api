/**
 * Rutas de Tienda - Cobblemon Los Pitufos Backend API
 */

import { Router } from 'express';
import { ShopController } from './shop.controller.js';
import { ShopService } from './shop.service.js';
import { getUsersCollection, getShopStockCollection, getShopPurchasesCollection } from '../../config/database.js';
import { createRateLimiter } from '../../shared/utils/rate-limiter.js';
import { ipWhitelistMiddleware } from '../../shared/middleware/ip-whitelist.js';

export async function createShopRouter(): Promise<Router> {
  const router = Router();

  const usersCollection = await getUsersCollection();
  const shopStockCollection = await getShopStockCollection();
  const shopPurchasesCollection = await getShopPurchasesCollection();

  const shopService = new ShopService(usersCollection, shopStockCollection, shopPurchasesCollection);
  const shopController = new ShopController(shopService);

  const readLimiter = createRateLimiter({ windowMs: 60000, max: 100, message: 'Demasiadas solicitudes' });
  const writeLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Demasiadas solicitudes' });

  router.get('/stock', readLimiter, shopController.getStock);
  router.get('/balance', readLimiter, shopController.getBalance);
  router.post('/purchase', writeLimiter, shopController.purchase);
  router.get('/purchases', ipWhitelistMiddleware, readLimiter, shopController.getPurchases);
  router.post('/claim', ipWhitelistMiddleware, writeLimiter, shopController.claimPurchase);

  return router;
}
