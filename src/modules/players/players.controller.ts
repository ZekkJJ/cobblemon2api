/**
 * Controlador de Jugadores
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja las solicitudes HTTP relacionadas con jugadores
 */

import { Request, Response } from 'express';
import { PlayersService } from './players.service.js';
import { playerSyncSchema, starterGivenSchema } from './players.schema.js';
import { asyncHandler, Errors } from '../../shared/middleware/error-handler.js';
import { z } from 'zod';

/**
 * Esquema de validación para UUID en query params
 */
const uuidQuerySchema = z.object({
  uuid: z.string().uuid('UUID de Minecraft inválido'),
});

/**
 * Esquema de validación para UUID en params
 */
const uuidParamSchema = z.object({
  uuid: z.string().uuid('UUID de Minecraft inválido'),
});

export class PlayersController {
  constructor(private playersService: PlayersService) {}

  /**
   * GET /api/players
   * Obtiene lista de todos los jugadores
   */
  getAllPlayers = asyncHandler(async (req: Request, res: Response) => {
    const players = await this.playersService.getAllPlayers();

    res.json({
      success: true,
      players,
      count: players.length,
    });
  });

  /**
   * GET /api/players/:uuid
   * Obtiene el perfil completo de un jugador
   */
  getPlayerProfile = asyncHandler(async (req: Request, res: Response) => {
    // Validar UUID en params
    const validatedParams = uuidParamSchema.parse(req.params);
    const profile = await this.playersService.getPlayerProfile(validatedParams.uuid);

    res.json({
      success: true,
      profile,
    });
  });

  /**
   * POST /api/players/sync
   * Sincroniza datos de un jugador desde el plugin de Minecraft
   */
  syncPlayerData = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = playerSyncSchema.parse(req.body);

    // Sincronizar datos
    const result = await this.playersService.syncPlayerData(validatedData);

    res.json({
      success: true,
      banned: result.banned,
      banReason: result.banReason,
    });
  });

  /**
   * GET /api/players/starter
   * Verifica si un jugador tiene un starter pendiente de entrega
   */
  checkPendingStarter = asyncHandler(async (req: Request, res: Response) => {
    // Validar UUID en query
    const validatedQuery = uuidQuerySchema.parse({ uuid: req.query['uuid'] });
    const result = await this.playersService.checkPendingStarter(validatedQuery.uuid);

    res.json(result);
  });

  /**
   * POST /api/players/starter-given
   * Marca el starter como entregado
   */
  markStarterAsGiven = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = starterGivenSchema.parse(req.body);

    // Marcar como entregado
    const result = await this.playersService.markStarterAsGiven(validatedData);

    res.json(result);
  });

  /**
   * GET /api/players/verification-status
   * Obtiene el estado de verificación de un jugador
   */
  getVerificationStatus = asyncHandler(async (req: Request, res: Response) => {
    // Validar UUID en query
    const validatedQuery = uuidQuerySchema.parse({ uuid: req.query['uuid'] });
    const status = await this.playersService.getVerificationStatus(validatedQuery.uuid);

    res.json(status);
  });

  /**
   * GET /api/players/ban-status
   * Obtiene el estado de ban de un jugador
   */
  getBanStatus = asyncHandler(async (req: Request, res: Response) => {
    // Validar UUID en query
    const validatedQuery = uuidQuerySchema.parse({ uuid: req.query['uuid'] });
    const status = await this.playersService.getBanStatus(validatedQuery.uuid);

    res.json(status);
  });
}
