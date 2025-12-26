import { Request, Response } from 'express';
import { LevelCapsService } from './level-caps.service.js';
import { asyncHandler, Errors } from '../../shared/middleware/error-handler.js';
import { z } from 'zod';

/**
 * Esquema de validación para consulta de caps efectivos
 */
const getEffectiveCapsSchema = z.object({
  uuid: z.string().uuid('UUID de Minecraft inválido'),
});

/**
 * Esquema de validación para actualizar configuración
 */
const updateConfigSchema = z.object({
  captureCapEnabled: z.boolean().optional(),
  ownershipCapEnabled: z.boolean().optional(),
  defaultCaptureCapFormula: z.string().max(200).optional(),
  defaultOwnershipCapFormula: z.string().max(200).optional(),
  defaultCaptureCap: z.number().int().min(1).max(100).optional(),
  defaultOwnershipCap: z.number().int().min(1).max(100).optional(),
  enforcementMode: z.enum(['hard', 'soft']).optional(),
  customMessages: z.object({
    captureFailed: z.string().max(200).optional(),
    expBlocked: z.string().max(200).optional(),
  }).optional(),
  pokemonRestrictions: z.object({
    blockLegendaries: z.boolean().optional(),
    blockMythicals: z.boolean().optional(),
    blockUltraBeasts: z.boolean().optional(),
    blockParadox: z.boolean().optional(),
    blockMegas: z.boolean().optional(),
    blockRestricted: z.boolean().optional(),
    customBlockedSpecies: z.array(z.string()).optional(),
    customAllowedSpecies: z.array(z.string()).optional(),
  }).optional(),
});

export class LevelCapsController {
  constructor(private levelCapsService: LevelCapsService) {}

  getEffectiveCaps = asyncHandler(async (req: Request, res: Response) => {
    // Validar query params
    const validatedQuery = getEffectiveCapsSchema.parse({ uuid: req.query['uuid'] });
    const caps = await this.levelCapsService.getEffectiveCaps(validatedQuery.uuid);
    res.json({ ...caps, success: true });
  });

  getVersion = asyncHandler(async (req: Request, res: Response) => {
    const version = await this.levelCapsService.getVersion();
    res.json(version);
  });

  getConfig = asyncHandler(async (req: Request, res: Response) => {
    const config = await this.levelCapsService.getConfig();
    res.json(config);
  });

  updateConfig = asyncHandler(async (req: Request, res: Response) => {
    // El frontend envía { globalConfig: { ... } }
    const globalConfig = req.body.globalConfig || req.body;
    
    // Validar body
    const validatedData = updateConfigSchema.parse(globalConfig);
    const adminName = (req as any).user?.discordUsername || 'Admin';
    
    // Pasar como globalConfig al servicio
    const config = await this.levelCapsService.updateConfig({ globalConfig: validatedData as any }, adminName);
    
    console.log(`[LEVEL CAPS] Config updated by ${adminName}, version: ${config.version}`);
    console.log(`[LEVEL CAPS] 🔔 Plugin should detect this change and refresh all player caches`);
    
    res.json(config);
  });
}
