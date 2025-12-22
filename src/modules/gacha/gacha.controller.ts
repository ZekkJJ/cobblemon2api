/**
 * Controlador de Gacha
 * Cobblemon Los Pitufos - Backend API
 * 
 * Maneja las solicitudes HTTP relacionadas con el sistema gacha
 */

import { Request, Response } from 'express';
import { GachaService } from './gacha.service.js';
import { SoulDrivenService, SoulDrivenAnswers } from './soul-driven.service.js';
import { asyncHandler, Errors } from '../../shared/middleware/error-handler.js';
import { z } from 'zod';

/**
 * Esquema de validación para tirada clásica
 */
const classicRollSchema = z.object({
  discordId: z.string().min(1, 'Discord ID es requerido'),
  discordUsername: z.string().optional(),
});

/**
 * Esquema de validación para tirada Soul Driven
 */
const soulDrivenRollSchema = z.object({
  discordId: z.string().min(1, 'Discord ID es requerido'),
  discordUsername: z.string().min(1, 'Discord username es requerido'),
  answers: z.object({
    combatStyle: z.string().min(1, 'Estilo de combate es requerido'),
    environment: z.string().min(1, 'Ambiente es requerido'),
    personality: z.string().min(1, 'Personalidad es requerida'),
    companionValue: z.string().min(1, 'Valor en compañero es requerido'),
    strength: z.string().min(1, 'Fortaleza es requerida'),
    dream: z.string().min(1, 'Sueño es requerido'),
  }),
});

export class GachaController {
  constructor(
    private gachaService: GachaService,
    private soulDrivenService: SoulDrivenService
  ) {}

  /**
   * GET /api/gacha/roll
   * Verifica el estado de tirada de un usuario
   */
  checkRollStatus = asyncHandler(async (req: Request, res: Response) => {
    const discordId = req.query['discordId'] as string;

    if (!discordId) {
      throw Errors.validationError('Discord ID es requerido');
    }

    const status = await this.gachaService.checkRollStatus(discordId);

    res.json(status);
  });

  /**
   * POST /api/gacha/roll
   * Realiza una tirada clásica (aleatoria)
   */
  performClassicRoll = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = classicRollSchema.parse(req.body);

    // Realizar tirada
    const result = await this.gachaService.performClassicRoll(
      validatedData.discordId,
      validatedData.discordUsername
    );

    res.json(result);
  });

  /**
   * POST /api/gacha/soul-driven
   * Realiza una tirada Soul Driven basada en personalidad
   */
  performSoulDrivenRoll = asyncHandler(async (req: Request, res: Response) => {
    // Validar datos de entrada
    const validatedData = soulDrivenRollSchema.parse(req.body);

    // Realizar tirada Soul Driven
    const result = await this.soulDrivenService.performSoulDrivenRoll(
      validatedData.discordId,
      validatedData.discordUsername,
      validatedData.answers as SoulDrivenAnswers
    );

    res.json(result);
  });

  /**
   * GET /api/starters
   * Obtiene todos los starters con su estado de reclamo
   */
  getAllStarters = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.gachaService.getAllStarters();

    res.json(result);
  });

  /**
   * POST /api/gacha/delivery/start
   * Marca el inicio de la entrega del starter (idempotencia)
   */
  markDeliveryStart = asyncHandler(async (req: Request, res: Response) => {
    const uuid = req.body.uuid as string;

    if (!uuid) {
      throw Errors.validationError('UUID es requerido');
    }

    const result = await this.gachaService.markDeliveryStart(uuid);
    res.json(result);
  });

  /**
   * POST /api/gacha/delivery/success
   * Marca la entrega del starter como exitosa
   */
  markDeliverySuccess = asyncHandler(async (req: Request, res: Response) => {
    const uuid = req.body.uuid as string;

    if (!uuid) {
      throw Errors.validationError('UUID es requerido');
    }

    const result = await this.gachaService.markDeliverySuccess(uuid);
    res.json(result);
  });

  /**
   * POST /api/gacha/delivery/failed
   * Marca la entrega del starter como fallida
   */
  markDeliveryFailed = asyncHandler(async (req: Request, res: Response) => {
    const uuid = req.body.uuid as string;
    const reason = req.body.reason as string;

    if (!uuid) {
      throw Errors.validationError('UUID es requerido');
    }

    if (!reason) {
      throw Errors.validationError('Razón es requerida');
    }

    const result = await this.gachaService.markDeliveryFailed(uuid, reason);
    res.json(result);
  });

  /**
   * GET /api/gacha/delivery/status
   * Obtiene el estado de entrega del starter
   */
  getDeliveryStatus = asyncHandler(async (req: Request, res: Response) => {
    const uuid = req.query['uuid'] as string;

    if (!uuid) {
      throw Errors.validationError('UUID es requerido');
    }

    const result = await this.gachaService.getDeliveryStatus(uuid);
    res.json(result);
  });
}
