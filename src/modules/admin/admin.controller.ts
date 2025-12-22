import { Request, Response } from 'express';
import { AdminService } from './admin.service.js';
import { asyncHandler, Errors } from '../../shared/middleware/error-handler.js';
import { z } from 'zod';

const banSchema = z.object({
  uuid: z.string().uuid(),
  banReason: z.string().min(1),
  ban: z.boolean(),
});

export class AdminController {
  constructor(private adminService: AdminService) {}

  banPlayer = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = banSchema.parse(req.body);
    const adminName = (req as any).user?.discordUsername || 'Admin';

    if (validatedData.ban) {
      const result = await this.adminService.banPlayer(validatedData.uuid, validatedData.banReason, adminName);
      res.json(result);
    } else {
      const result = await this.adminService.unbanPlayer(validatedData.uuid, adminName);
      res.json(result);
    }
  });

  resetDatabase = asyncHandler(async (req: Request, res: Response) => {
    const adminName = (req as any).user?.discordUsername || 'Admin';
    const result = await this.adminService.resetDatabase(adminName);
    res.json(result);
  });

  getBanStatus = asyncHandler(async (req: Request, res: Response) => {
    const { uuid } = req.query;

    if (!uuid || typeof uuid !== 'string') {
      throw Errors.VALIDATION_ERROR('UUID is required');
    }

    const status = await this.adminService.getBanStatus(uuid);
    res.json(status);
  });
}
