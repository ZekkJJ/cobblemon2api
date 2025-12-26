/**
 * Pokemon Gacha Controller
 * Cobblemon Los Pitufos - Backend API
 * 
 * Controlador HTTP para el sistema gacha
 */

import { Request, Response } from 'express';
import { PokemonGachaService } from './pokemon-gacha.service.js';
import { BannerService } from './banner.service.js';
import { asyncHandler, Errors } from '../../shared/middleware/error-handler.js';
import {
  PullRequestSchema,
  MultiPullRequestSchema,
  HistoryFiltersSchema,
  CreateBannerSchema,
  UpdateBannerSchema,
  ClaimRewardSchema,
} from '../../shared/types/pokemon-gacha.types.js';

export class PokemonGachaController {
  constructor(
    private gachaService: PokemonGachaService,
    private bannerService: BannerService
  ) {}

  // ============================================
  // ENDPOINTS DE TIRADAS
  // ============================================

  /**
   * POST /api/pokemon-gacha/pull
   * Ejecuta una tirada simple
   */
  pull = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.discordId) {
      throw Errors.unauthorized('Debes iniciar sesión para hacer tiradas');
    }

    const validated = PullRequestSchema.parse(req.body);

    const result = await this.gachaService.pull(
      user.discordId,
      validated.bannerId,
      validated.idempotencyKey
    );

    res.json(result);
  });

  /**
   * POST /api/pokemon-gacha/multi-pull
   * Ejecuta 10 tiradas
   */
  multiPull = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.discordId) {
      throw Errors.unauthorized('Debes iniciar sesión para hacer tiradas');
    }

    const validated = MultiPullRequestSchema.parse(req.body);

    const result = await this.gachaService.multiPull(
      user.discordId,
      validated.bannerId,
      validated.idempotencyKey
    );

    res.json(result);
  });

  // ============================================
  // ENDPOINTS DE INFORMACIÓN
  // ============================================

  /**
   * GET /api/pokemon-gacha/banners
   * Obtiene todos los banners activos
   */
  getBanners = asyncHandler(async (req: Request, res: Response) => {
    const banners = await this.gachaService.getActiveBanners();
    res.json({ success: true, banners });
  });

  /**
   * GET /api/pokemon-gacha/banners/:id
   * Obtiene un banner por ID
   */
  getBanner = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const banner = await this.gachaService.getBanner(id);

    if (!banner) {
      throw Errors.notFound('Banner no encontrado');
    }

    res.json({ success: true, banner });
  });

  /**
   * GET /api/pokemon-gacha/pity/:bannerId
   * Obtiene el estado de pity del jugador
   */
  getPityStatus = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.discordId) {
      throw Errors.unauthorized('Debes iniciar sesión');
    }

    const { bannerId } = req.params;
    const pityStatus = await this.gachaService.getPityStatus(user.discordId, bannerId);

    res.json({ success: true, pityStatus });
  });

  /**
   * GET /api/pokemon-gacha/history
   * Obtiene el historial de tiradas del jugador
   */
  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.discordId) {
      throw Errors.unauthorized('Debes iniciar sesión');
    }

    const filters = HistoryFiltersSchema.parse(req.query);
    const history = await this.gachaService.getHistory(user.discordId, filters);

    res.json({ success: true, history, count: history.length });
  });

  /**
   * GET /api/pokemon-gacha/stats
   * Obtiene estadísticas del jugador
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.discordId) {
      throw Errors.unauthorized('Debes iniciar sesión');
    }

    const stats = await this.gachaService.getStats(user.discordId);

    res.json({ success: true, stats });
  });

  // ============================================
  // ENDPOINTS DE ENTREGA (PLUGIN)
  // ============================================

  /**
   * GET /api/pokemon-gacha/pending/:uuid
   * Obtiene recompensas pendientes de un jugador (para plugin)
   */
  getPendingRewards = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.params;
    const rewards = await this.gachaService.getPendingRewards(uuid);

    res.json({ success: true, rewards, count: rewards.length });
  });

  /**
   * POST /api/pokemon-gacha/claim/:rewardId
   * Marca una recompensa como reclamada (para plugin)
   */
  claimReward = asyncHandler(async (req: Request, res: Response) => {
    const { rewardId } = req.params;
    const success = await this.gachaService.markRewardAsClaimed(rewardId);

    if (!success) {
      throw Errors.notFound('Recompensa no encontrada o ya reclamada');
    }

    res.json({ success: true, message: 'Recompensa reclamada exitosamente' });
  });

  /**
   * POST /api/pokemon-gacha/delivery/start
   * Marca inicio de entrega (para plugin)
   */
  startDelivery = asyncHandler(async (req: Request, res: Response) => {
    const { rewardId } = req.body;
    const success = await this.gachaService.markDeliveryStart(rewardId);

    res.json({ success, canDeliver: success });
  });

  /**
   * POST /api/pokemon-gacha/delivery/failed
   * Marca entrega fallida (para plugin)
   */
  failDelivery = asyncHandler(async (req: Request, res: Response) => {
    const { rewardId, reason } = req.body;
    const success = await this.gachaService.markRewardAsFailed(rewardId, reason || 'Unknown error');

    res.json({ success });
  });

  // ============================================
  // ENDPOINTS DE ADMIN
  // ============================================

  /**
   * GET /api/pokemon-gacha/admin/banners
   * Obtiene todos los banners (admin)
   */
  getAllBanners = asyncHandler(async (req: Request, res: Response) => {
    const banners = await this.bannerService.getAllBanners();
    res.json({ success: true, banners });
  });

  /**
   * POST /api/pokemon-gacha/admin/banners
   * Crea un nuevo banner (admin)
   */
  createBanner = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.isAdmin) {
      throw Errors.forbidden('Solo administradores pueden crear banners');
    }

    const validated = CreateBannerSchema.parse(req.body);
    const banner = await this.bannerService.createBanner(validated, user.discordId);

    res.status(201).json({ success: true, banner });
  });

  /**
   * PUT /api/pokemon-gacha/admin/banners/:id
   * Actualiza un banner (admin)
   */
  updateBanner = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.isAdmin) {
      throw Errors.forbidden('Solo administradores pueden actualizar banners');
    }

    const { id } = req.params;
    const validated = UpdateBannerSchema.parse(req.body);
    const banner = await this.bannerService.updateBanner(id, validated);

    res.json({ success: true, banner });
  });

  /**
   * DELETE /api/pokemon-gacha/admin/banners/:id
   * Desactiva un banner (admin)
   */
  deleteBanner = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.isAdmin) {
      throw Errors.forbidden('Solo administradores pueden eliminar banners');
    }

    const { id } = req.params;
    await this.bannerService.deactivateBanner(id);

    res.json({ success: true, message: 'Banner desactivado exitosamente' });
  });
}
