/**
 * Player Shop Controller
 * Cobblemon Los Pitufos - Backend API
 * 
 * Controlador HTTP para el módulo de Player Shop.
 */

import { Request, Response, NextFunction } from 'express';
import { PlayerShopService } from './player-shop.service.js';
import {
  createListingSchema,
  listingFiltersSchema,
  placeBidSchema,
  listingIdSchema,
  markDeliveredSchema,
  playerUuidSchema,
} from './player-shop.schema.js';
import { AppError } from '../../shared/middleware/error-handler.js';

export class PlayerShopController {
  constructor(private playerShopService: PlayerShopService) {}

  // ============================================
  // LISTING ENDPOINTS
  // ============================================

  /**
   * POST /api/player-shop/listings
   * Crear un nuevo listing
   */
  createListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar input
      const validatedData = createListingSchema.parse(req.body);

      // Obtener UUID del usuario autenticado
      const sellerId = this.getUserUuid(req);

      const listing = await this.playerShopService.createListing(
        sellerId,
        validatedData.pokemonUuid,
        {
          saleMethod: validatedData.saleMethod,
          price: validatedData.price,
          startingBid: validatedData.startingBid,
          duration: validatedData.duration,
        }
      );

      res.status(201).json({
        success: true,
        listing,
        message: 'Listing creado exitosamente',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/player-shop/listings
   * Obtener listings activos con filtros
   */
  getListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = listingFiltersSchema.parse(req.query);

      const result = await this.playerShopService.getActiveListings(filters);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/player-shop/listings/:id
   * Obtener detalle de un listing
   */
  getListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = listingIdSchema.parse(req.params);

      const listing = await this.playerShopService.getListing(id);

      res.json({
        success: true,
        listing,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/player-shop/listings/:id
   * Cancelar un listing
   */
  cancelListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = listingIdSchema.parse(req.params);
      const userId = this.getUserUuid(req);

      await this.playerShopService.cancelListing(id, userId);

      res.json({
        success: true,
        message: 'Listing cancelado. Tu Pokémon será devuelto.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/player-shop/my-listings
   * Obtener listings del usuario autenticado
   */
  getMyListings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserUuid(req);

      const listings = await this.playerShopService.getMyListings(userId);

      res.json({
        success: true,
        listings,
      });
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // PURCHASE ENDPOINTS
  // ============================================

  /**
   * POST /api/player-shop/listings/:id/purchase
   * Compra directa de un listing
   */
  purchaseListing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = listingIdSchema.parse(req.params);
      const buyerId = this.getUserUuid(req);

      const result = await this.playerShopService.purchaseDirect(id, buyerId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // BIDDING ENDPOINTS
  // ============================================

  /**
   * POST /api/player-shop/listings/:id/bid
   * Colocar una puja
   */
  placeBid = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = listingIdSchema.parse(req.params);
      const { amount } = placeBidSchema.parse(req.body);
      const bidderId = this.getUserUuid(req);

      const result = await this.playerShopService.placeBid(id, bidderId, amount);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/player-shop/listings/:id/bids
   * Obtener historial de pujas
   */
  getBidHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = listingIdSchema.parse(req.params);

      const bids = await this.playerShopService.getBidHistory(id);

      res.json({
        success: true,
        bids,
      });
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // DELIVERY ENDPOINTS (Plugin)
  // ============================================

  /**
   * GET /api/player-shop/deliveries
   * Obtener entregas pendientes (para plugin)
   */
  getPendingDeliveries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uuid } = playerUuidSchema.parse(req.query);

      const deliveries = await this.playerShopService.getPendingDeliveries(uuid);

      res.json({
        success: true,
        deliveries,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/player-shop/deliveries/:id/delivered
   * Marcar entrega como completada (para plugin)
   */
  markDelivered = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await this.playerShopService.markDelivered(id);

      res.json({
        success: true,
        message: 'Entrega marcada como completada',
      });
    } catch (error) {
      next(error);
    }
  };

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Obtiene el UUID del usuario de la sesión
   */
  private getUserUuid(req: Request): string {
    // Primero intentar obtener de la sesión
    const session = (req as any).session;
    if (session?.user?.minecraftUuid) {
      return session.user.minecraftUuid;
    }

    // Si no hay sesión, verificar header de plugin
    const pluginUuid = req.headers['x-player-uuid'] as string;
    if (pluginUuid) {
      return pluginUuid;
    }

    // Verificar query param (para endpoints de plugin)
    const queryUuid = req.query.uuid as string;
    if (queryUuid) {
      return queryUuid;
    }

    throw new AppError('UNAUTHORIZED', 'Usuario no autenticado', 401);
  }
}
