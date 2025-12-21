import { Request, Response } from 'express';
import { LevelCapsService } from './level-caps.service.js';
import { asyncHandler, Errors } from '../../shared/middleware/error-handler.js';

export class LevelCapsController {
  constructor(private levelCapsService: LevelCapsService) {}

  getEffectiveCaps = asyncHandler(async (req: Request, res: Response) => {
    const uuid = req.query['uuid'] as string;
    if (!uuid) throw Errors.validationError('UUID es requerido');
    const caps = await this.levelCapsService.getEffectiveCaps(uuid);
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
    const adminName = (req as any).user?.discordUsername || 'Admin';
    const config = await this.levelCapsService.updateConfig(req.body, adminName);
    res.json(config);
  });
}
