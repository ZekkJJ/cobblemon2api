/**
 * Player Shop Routes
 * Cobblemon Los Pitufos - Backend API
 * 
 * Rutas HTTP para el módulo de Player Shop.
 */

import { Router } from 'express';
import { PlayerShopController } from './player-shop.controller.js';
import { PlayerShopService } from './player-shop.service.js';
import { PitufipuntosService } from './pitufipuntos.service.js';
import { TransactionManager } from '../../shared/utils/transaction-manager.js';
import { Collection } from 'mongodb';
import { User } from '../../shared/types/user.types.js';
import { Listing, Bid, PendingDelivery } from '../../shared/types/player-shop.types.js';

/**
 * Crea las rutas del Player Shop
 */
export function createPlayerShopRoutes(
  usersCollection: Collection<User>,
  listingsCollection: Collection<Listing>,
  bidsCollection: Collection<Bid>,
  deliveriesCollection: Collection<PendingDelivery>,
  transactionManager: TransactionManager
): Router {
  const router = Router();

  // Crear servicio y controlador
  const playerShopService = new PlayerShopService(
    usersCollection,
    listingsCollection,
    bidsCollection,
    deliveriesCollection,
    transactionManager
  );

  const controller = new PlayerShopController(playerShopService);

  // ============================================
  // LISTING ROUTES
  // ============================================

  /**
   * POST /api/player-shop/listings
   * Crear un nuevo listing
   * Requiere autenticación
   */
  router.post('/listings', controller.createListing);

  /**
   * GET /api/player-shop/listings
   * Obtener listings activos con filtros
   * Público
   */
  router.get('/listings', controller.getListings);

  /**
   * GET /api/player-shop/my-listings
   * Obtener listings del usuario autenticado
   * Requiere autenticación
   */
  router.get('/my-listings', controller.getMyListings);

  /**
   * GET /api/player-shop/listings/:id
   * Obtener detalle de un listing
   * Público
   */
  router.get('/listings/:id', controller.getListing);

  /**
   * DELETE /api/player-shop/listings/:id
   * Cancelar un listing
   * Requiere autenticación (dueño)
   */
  router.delete('/listings/:id', controller.cancelListing);

  // ============================================
  // PURCHASE ROUTES
  // ============================================

  /**
   * POST /api/player-shop/listings/:id/purchase
   * Compra directa de un listing
   * Requiere autenticación
   */
  router.post('/listings/:id/purchase', controller.purchaseListing);

  // ============================================
  // BIDDING ROUTES
  // ============================================

  /**
   * POST /api/player-shop/listings/:id/bid
   * Colocar una puja
   * Requiere autenticación
   */
  router.post('/listings/:id/bid', controller.placeBid);

  /**
   * GET /api/player-shop/listings/:id/bids
   * Obtener historial de pujas
   * Público
   */
  router.get('/listings/:id/bids', controller.getBidHistory);

  // ============================================
  // DELIVERY ROUTES (Plugin)
  // ============================================

  /**
   * GET /api/player-shop/deliveries
   * Obtener entregas pendientes
   * Para uso del plugin
   */
  router.get('/deliveries', controller.getPendingDeliveries);

  /**
   * POST /api/player-shop/deliveries/:id/delivered
   * Marcar entrega como completada
   * Para uso del plugin
   */
  router.post('/deliveries/:id/delivered', controller.markDelivered);

  return router;
}

// Export para compatibilidad
export const playerShopRoutes = createPlayerShopRoutes;
